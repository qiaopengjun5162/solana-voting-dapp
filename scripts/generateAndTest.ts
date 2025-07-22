import { createFromRoot, ProgramUpdates, updateProgramsVisitor } from "codama";
import { rootNodeFromAnchor } from "@codama/nodes-from-anchor";
import { renderJavaScriptVisitor, renderRustVisitor } from "@codama/renderers";
import * as fs from "fs";
import * as path from "path";

/**
 * 为单个程序生成所有客户端代码的通用函数
 * @param programName - 要处理的程序名
 */
async function generateClientsForProgram(programName: string) {
  console.log(`\n🚀 开始为程序 [${programName}] 生成客户端...`);

  try {
    // --- 1. 根据程序名动态定义所有路径 ---
    const projectRoot = path.join(__dirname, "..");
    const anchorIdlPath = path.join(
      projectRoot,
      "target",
      "idl",
      `${programName}.json`,
    );

    // 为了更好地组织，我们将每个程序的生成代码放在独立的子目录中
    const outputTsPath = path.join(projectRoot, "generated", "ts", programName);
    const outputRsPath = path.join(projectRoot, "generated", "rs", programName);
    const outputCodamaIdlDir = path.join(projectRoot, "codama");
    const outputCodamaIdlPath = path.join(
      outputCodamaIdlDir,
      `${programName}.codama.json`,
    );

    console.log(`  - 读取 IDL 从: ${anchorIdlPath}`);

    // --- 2. 读取并转换 IDL ---
    if (!fs.existsSync(anchorIdlPath)) {
      console.warn(
        `  - ⚠️ 警告: 找不到 ${programName} 的 IDL 文件，跳过此程序。`,
      );
      return;
    }
    const anchorIdl = JSON.parse(fs.readFileSync(anchorIdlPath, "utf-8"));
    const codama = createFromRoot(rootNodeFromAnchor(anchorIdl));
    console.log(`  - ✅ Anchor IDL 已成功转换为 Codama 格式。`);

    // --- 3. 保存 Codama 中间格式的 IDL 文件 ---
    if (!fs.existsSync(outputCodamaIdlDir)) {
      fs.mkdirSync(outputCodamaIdlDir, { recursive: true });
    }
    fs.writeFileSync(outputCodamaIdlPath, codama.getJson());
    console.log(`  - ✅ Codama 格式的 IDL 已保存到: ${outputCodamaIdlPath}`);

    // --- 4. 生成最终的客户端代码 ---
    codama.accept(renderJavaScriptVisitor(outputTsPath, {}));
    console.log(`  - ✅ TypeScript 客户端已成功生成到: ${outputTsPath}`);

    codama.accept(renderRustVisitor(outputRsPath, {}));
    console.log(`  - ✅ Rust 客户端辅助代码已成功生成到: ${outputRsPath}`);
  } catch (error) {
    console.error(`  - ❌ 处理程序 [${programName}] 时发生错误:`, error);
  }
}

/**
 * 主执行函数
 */
async function main() {
  // --- 在这里列出你所有需要生成客户端的程序 ---
  const programsToGenerate = [
    "voting",
    // 未来有新程序，只需在这里添加名字即可
  ];

  console.log(`--- 开始为 ${programsToGenerate.length} 个程序生成客户端 ---`);

  for (const programName of programsToGenerate) {
    await generateClientsForProgram(programName);
  }
}

// --- 脚本入口 ---
main()
  .then(() => console.log("\n--- 所有脚本执行完毕 ---"))
  .catch(console.error);

/**
voting on  master [!?] via ⬢ v23.11.0 via 🦀 1.88.0
➜ bun run scripts/generateAndTest.ts
--- 开始为 1 个程序生成客户端 ---

🚀 开始为程序 [voting] 生成客户端...
  - 读取 IDL 从: /Users/qiaopengjun/Code/Solana/voting/target/idl/voting.json
  - ✅ Anchor IDL 已成功转换为 Codama 格式。
  - ✅ Codama 格式的 IDL 已保存到: /Users/qiaopengjun/Code/Solana/voting/codama/voting.codama.json
  - ✅ TypeScript 客户端已成功生成到: /Users/qiaopengjun/Code/Solana/voting/generated/ts/voting
  - ✅ Rust 客户端辅助代码已成功生成到: /Users/qiaopengjun/Code/Solana/voting/generated/rs/voting

--- 所有脚本执行完毕 ---
*/
