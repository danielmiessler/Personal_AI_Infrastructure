/**
 * PAI Uninstaller — CLI Interactive Prompts
 * readline-based input collection.
 */

import * as readline from "readline";
import { c, print } from "./display";

/**
 * Prompt for yes/no confirmation.
 */
export async function promptConfirm(
  question: string,
  defaultYes: boolean = false
): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const hint = defaultYes ? `${c.gray}(Y/n)${c.reset}` : `${c.gray}(y/N)${c.reset}`;

  return new Promise<boolean>((resolve) => {
    rl.question(`\n  ${c.yellow}${question}${c.reset} ${hint} `, (answer) => {
      rl.close();
      const val = answer.trim().toLowerCase();
      if (val === "") resolve(defaultYes);
      else resolve(val === "y" || val === "yes");
    });
  });
}
