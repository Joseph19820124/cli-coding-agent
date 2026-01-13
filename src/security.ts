import * as readline from 'readline';
import chalk from 'chalk';

// Sensitive file patterns
const SENSITIVE_PATTERNS = [
  /^\.env($|\.)/i,                    // .env, .env.local, .env.production
  /^\.env\..+$/i,
  /credentials?\.(json|yaml|yml|xml|txt)$/i,
  /secrets?\.(json|yaml|yml|xml|txt)$/i,
  /^id_rsa/,                          // SSH private keys
  /^id_ed25519/,
  /^id_ecdsa/,
  /\.pem$/i,
  /\.key$/i,
  /\.p12$/i,
  /\.pfx$/i,
  /password/i,
  /^\.ssh\//,
  /^\.aws\//,
  /^\.gcp\//,
  /token/i,
  /apikey/i,
  /api_key/i,
  /auth\.json$/i,
  /service[-_]?account.*\.json$/i,
];

// Dangerous command patterns
const DANGEROUS_COMMANDS = [
  { pattern: /rm\s+(-[rf]+\s+)*[\/~]/, message: 'Deleting from root or home directory' },
  { pattern: /rm\s+-rf?\s+\*/, message: 'Recursive delete with wildcard' },
  { pattern: />\s*\/dev\/sd[a-z]/, message: 'Writing to disk device' },
  { pattern: /mkfs\./, message: 'Formatting filesystem' },
  { pattern: /dd\s+.*of=\/dev\//, message: 'Direct disk write with dd' },
  { pattern: /:\(\)\{\s*:\|:\s*&\s*\};:/, message: 'Fork bomb detected' },
  { pattern: /chmod\s+(-R\s+)?777/, message: 'Setting overly permissive permissions' },
  { pattern: /curl\s+.*\|\s*(ba)?sh/, message: 'Piping curl to shell' },
  { pattern: /wget\s+.*\|\s*(ba)?sh/, message: 'Piping wget to shell' },
  { pattern: /git\s+push\s+.*--force\s+.*main/, message: 'Force pushing to main' },
  { pattern: /git\s+push\s+.*--force\s+.*master/, message: 'Force pushing to master' },
  { pattern: /git\s+reset\s+--hard/, message: 'Hard reset (destructive)' },
  { pattern: /DROP\s+DATABASE/i, message: 'Dropping database' },
  { pattern: /DROP\s+TABLE/i, message: 'Dropping table' },
  { pattern: /TRUNCATE\s+TABLE/i, message: 'Truncating table' },
];

// Risk levels
export type RiskLevel = 'safe' | 'low' | 'medium' | 'high' | 'critical';

export interface SecurityCheck {
  allowed: boolean;
  riskLevel: RiskLevel;
  reason?: string;
  requiresConfirmation: boolean;
}

// Check if a file path is sensitive
export function isSensitiveFile(filePath: string): { sensitive: boolean; reason?: string } {
  const fileName = filePath.split('/').pop() || filePath;

  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(fileName) || pattern.test(filePath)) {
      return {
        sensitive: true,
        reason: `File matches sensitive pattern: ${pattern.toString()}`,
      };
    }
  }

  return { sensitive: false };
}

// Check if a command is dangerous
export function isDangerousCommand(command: string): { dangerous: boolean; reason?: string } {
  for (const { pattern, message } of DANGEROUS_COMMANDS) {
    if (pattern.test(command)) {
      return { dangerous: true, reason: message };
    }
  }
  return { dangerous: false };
}

// Assess tool risk level
export function assessToolRisk(
  toolName: string,
  args: Record<string, unknown>
): SecurityCheck {
  switch (toolName) {
    case 'read': {
      const path = args.path as string;
      const check = isSensitiveFile(path);
      if (check.sensitive) {
        return {
          allowed: true,
          riskLevel: 'high',
          reason: `Reading sensitive file: ${path}`,
          requiresConfirmation: true,
        };
      }
      return { allowed: true, riskLevel: 'safe', requiresConfirmation: false };
    }

    case 'write': {
      const path = args.path as string;
      const check = isSensitiveFile(path);
      if (check.sensitive) {
        return {
          allowed: true,
          riskLevel: 'critical',
          reason: `Writing to sensitive file: ${path}`,
          requiresConfirmation: true,
        };
      }
      return {
        allowed: true,
        riskLevel: 'medium',
        reason: `Creating/overwriting file: ${path}`,
        requiresConfirmation: true,
      };
    }

    case 'edit': {
      const path = args.path as string;
      const check = isSensitiveFile(path);
      if (check.sensitive) {
        return {
          allowed: true,
          riskLevel: 'critical',
          reason: `Editing sensitive file: ${path}`,
          requiresConfirmation: true,
        };
      }
      return {
        allowed: true,
        riskLevel: 'low',
        reason: `Editing file: ${path}`,
        requiresConfirmation: true,
      };
    }

    case 'bash': {
      const command = args.command as string;
      const check = isDangerousCommand(command);
      if (check.dangerous) {
        return {
          allowed: true,
          riskLevel: 'critical',
          reason: check.reason,
          requiresConfirmation: true,
        };
      }
      // All bash commands require confirmation
      return {
        allowed: true,
        riskLevel: 'medium',
        reason: `Execute command: ${command.slice(0, 50)}${command.length > 50 ? '...' : ''}`,
        requiresConfirmation: true,
      };
    }

    case 'glob':
    case 'grep':
      return { allowed: true, riskLevel: 'safe', requiresConfirmation: false };

    default:
      return { allowed: true, riskLevel: 'low', requiresConfirmation: false };
  }
}

// Format risk level with color
export function formatRiskLevel(level: RiskLevel): string {
  switch (level) {
    case 'safe':
      return chalk.green('SAFE');
    case 'low':
      return chalk.blue('LOW');
    case 'medium':
      return chalk.yellow('MEDIUM');
    case 'high':
      return chalk.red('HIGH');
    case 'critical':
      return chalk.bgRed.white(' CRITICAL ');
  }
}

// Ask user for confirmation
export async function askConfirmation(
  toolName: string,
  args: Record<string, unknown>,
  check: SecurityCheck
): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    console.log('');
    console.log(chalk.yellow('━'.repeat(60)));
    console.log(chalk.yellow('  PERMISSION REQUEST'));
    console.log(chalk.yellow('━'.repeat(60)));
    console.log(`  Tool:  ${chalk.cyan(toolName)}`);
    console.log(`  Risk:  ${formatRiskLevel(check.riskLevel)}`);
    if (check.reason) {
      console.log(`  Info:  ${check.reason}`);
    }
    console.log(chalk.dim('  Args:  ' + JSON.stringify(args, null, 2).split('\n').join('\n        ')));
    console.log(chalk.yellow('━'.repeat(60)));

    rl.question(chalk.yellow('  Allow? [y/N]: '), (answer) => {
      rl.close();
      const allowed = answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
      if (allowed) {
        console.log(chalk.green('  ✓ Approved\n'));
      } else {
        console.log(chalk.red('  ✗ Denied\n'));
      }
      resolve(allowed);
    });
  });
}

// Auto-approve safe operations (can be configured)
export interface SecurityConfig {
  autoApproveSafe: boolean;
  autoApproveLow: boolean;
  autoApproveRead: boolean;
  blockCritical: boolean;
}

export const defaultSecurityConfig: SecurityConfig = {
  autoApproveSafe: true,   // Auto-approve safe operations (glob, grep)
  autoApproveLow: false,   // Require confirmation for low-risk ops
  autoApproveRead: false,  // Require confirmation for file reads
  blockCritical: false,    // Don't auto-block critical ops, just warn
};
