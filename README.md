# Solana Voting DApp

一个基于 Solana 区块链的去中心化投票应用，集成了 Substreams 实时数据索引和 PostgreSQL 数据持久化功能。

## 🚀 项目特色

- **去中心化投票**: 基于 Solana 区块链的安全投票系统
- **实时数据索引**: 使用 Substreams 实时捕获区块链数据
- **数据持久化**: PostgreSQL 数据库存储，支持复杂查询
- **现代化工具链**: Rust + Python + uv 开发环境
- **完整数据流**: 从区块链到 SQL 数据库的端到端解决方案

## 📋 目录结构

```
voting/
├── app/                          # 前端应用
├── programs/voting/              # Solana 智能合约
├── voting-substreams/            # Substreams 数据索引
│   └── voting_substreams/
│       ├── src/lib.rs           # Substreams 处理逻辑
│       ├── substreams.yaml      # Substreams 配置
│       ├── schema.sql           # 数据库表结构
│       └── pytools/             # Python 数据处理工具
│           ├── venv/            # Python 虚拟环境
│           └── db_processor.py  # 数据库写入脚本
├── voting-graph/                # Graph 子图（已弃用）
├── scripts/                     # 测试和部署脚本
└── tests/                       # 测试文件
```

## 🛠️ 技术栈

### 区块链层

- **Solana**: 高性能区块链平台
- **Anchor**: Solana 智能合约框架
- **Rust**: 智能合约开发语言

### 数据索引层

- **Substreams**: 实时区块链数据索引
- **StreamingFast**: 数据提供商

### 数据存储层

- **PostgreSQL**: 关系型数据库
- **Python**: 数据处理脚本
- **uv**: 现代化 Python 包管理

### 开发工具

- **TypeScript**: 前端开发
- **GraphQL**: 数据查询接口
- **Docker**: 容器化部署

## 📦 快速开始

### 前置要求

- Node.js 18+
- Rust 1.70+
- Python 3.11+
- PostgreSQL 14+
- Solana CLI

### 1. 克隆项目

```bash
git clone <repository-url>
cd voting
```

### 2. 安装依赖

```bash
# 安装 Rust 依赖
cargo build

# 安装 Node.js 依赖
npm install

# 安装 Python 依赖
cd voting-substreams/voting_substreams/pytools
uv venv venv
source venv/bin/activate
uv pip install psycopg2-binary
```

### 3. 配置环境

```bash
# 复制环境变量模板
cp .env.example .env

# 配置 Substreams API Token
echo "SUBSTREAMS_API_TOKEN=your_token_here" > voting-substreams/voting_substreams/.substreams.env
```

### 4. 设置数据库

```bash
# 创建数据库
createdb voting_data

# 导入表结构
psql -d voting_data -f voting-substreams/voting_substreams/schema.sql
```

### 5. 部署智能合约

```bash
# 构建程序
anchor build

# 部署到 devnet
anchor deploy --provider.cluster devnet
```

## 🔄 数据流配置

### Substreams 数据索引

1. **构建 Substreams 包**

```bash
cd voting-substreams/voting_substreams
cargo build --release
substreams pack substreams.yaml
```

2. **运行数据索引**

```bash
source .substreams.env
substreams run substreams.yaml map_program_data \
  --start-block=395814825 \
  --stop-block=+10000 \
  --output jsonl > output.jsonl
```

3. **导入到数据库**

```bash
cd pytools
source venv/bin/activate
cat ../output.jsonl | python db_processor.py
```

## 📊 数据查询示例

### 查询投票统计

```sql
-- 查看所有投票
SELECT name, description, creator FROM polls;

-- 查看候选人
SELECT name, poll_id FROM candidates;

-- 查看投票记录
SELECT voter, candidate_id FROM votes;

-- 投票统计视图
SELECT * FROM poll_statistics;
```

### 使用 Python 查询

```python
import psycopg2

conn = psycopg2.connect(
    host="localhost",
    database="voting_data",
    user="your_username"
)

with conn.cursor() as cur:
    cur.execute("SELECT * FROM poll_statistics")
    results = cur.fetchall()
    for row in results:
        print(f"投票: {row[1]}, 候选人: {row[3]}, 总票数: {row[4]}")
```

## 🧪 测试

### 运行智能合约测试

```bash
anchor test
```

### 运行 Substreams 测试

```bash
cd voting-substreams/voting_substreams
substreams run substreams.yaml map_program_data \
  --start-block=395814825 \
  --stop-block=+100 \
  --output jsonl | head -5
```

### 测试数据库连接

```bash
cd pytools
source venv/bin/activate
python -c "
import psycopg2
conn = psycopg2.connect('postgresql://localhost/voting_data')
print('数据库连接成功!')
conn.close()
"
```

## 🚀 部署

### 开发环境

```bash
# 启动前端开发服务器
npm run dev

# 启动 Substreams 实时数据流
substreams gui ./my-project-v0.1.0.spkg map_program_data \
  --start-block=395814825 \
  --stop-block=+300000 \
  -e devnet.sol.streamingfast.io:443
```

### 生产环境

```bash
# 构建生产版本
npm run build

# 部署到 Solana mainnet
anchor deploy --provider.cluster mainnet

# 设置生产数据库
# 配置 PostgreSQL 连接池
# 设置监控和日志
```

## 🔧 配置说明

### Substreams 配置

`voting-substreams/voting_substreams/substreams.yaml`:

```yaml
specVersion: v0.1.0
package:
  name: voting_substreams
  version: v0.1.0

modules:
  - name: map_program_data
    kind: map
    initialBlock: 395814825 # 起始区块
    inputs:
      - map: solana:blocks_without_votes
    output:
      type: proto:substreams.v1.program.Data
```

### 数据库配置

`voting-substreams/voting_substreams/pytools/db_processor.py`:

```python
DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "database": "voting_data",
    "user": "your_username",
    "password": "your_password",
}
```

## 🐛 故障排除

### 常见问题

1. **Substreams 认证失败**

   ```bash
   # 确保加载了 API Token
   source .substreams.env
   ```

2. **数据库连接失败**

   ```bash
   # 检查 PostgreSQL 服务状态
   brew services list | grep postgresql
   ```

3. **Python 依赖问题**

   ```bash
   # 重新安装依赖
   cd pytools
   uv pip install --force-reinstall psycopg2-binary
   ```

### 调试技巧

- 使用 `--output debug` 查看 Substreams 详细日志
- 检查 `.substreams.env` 文件中的 API Token
- 验证数据库表结构是否正确创建

## 📈 性能优化

### Substreams 优化

- 调整 `--stop-block` 参数控制处理范围
- 使用 `--output jsonl` 提高数据解析效率
- 配置合适的区块范围避免处理过多数据

### 数据库优化

- 为常用查询字段创建索引
- 使用连接池管理数据库连接
- 定期清理历史数据

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [Solana](https://solana.com/) - 高性能区块链平台
- [Substreams](https://substreams.streamingfast.io/) - 实时数据索引
- [Anchor](https://www.anchor-lang.com/) - Solana 开发框架
- [StreamingFast](https://streamingfast.io/) - 数据提供商

## 📞 联系方式

- 项目维护者: [Your Name]
- 邮箱: [your.email@example.com]
- 项目链接: [https://github.com/your-username/solana-voting-dapp]

---

⭐ 如果这个项目对您有帮助，请给我们一个星标！
