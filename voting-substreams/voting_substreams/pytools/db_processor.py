#!/usr/bin/env python3
"""
Substreams to PostgreSQL 数据处理器
将 Substreams 输出的投票数据写入 PostgreSQL 数据库
"""

import json
import sys
import psycopg2
from psycopg2.extras import RealDictCursor
import logging

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 数据库配置
DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "database": "voting_data",
    "user": "qiaopengjun",  # 替换为您的用户名
    "password": "",  # 如果有密码，请填写
}


def connect_db():
    """连接数据库"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        return conn
    except Exception as e:
        logger.error(f"数据库连接失败: {e}")
        return None


def insert_poll(conn, poll_data):
    """插入投票数据"""
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO polls (id, name, description, start_time, end_time,
                                 creator, poll_account, created_at, block_number, transaction_hash)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING
            """,
                (
                    poll_data.get("acctPollAccount"),  # 使用 poll account 作为 ID
                    poll_data.get("name"),
                    poll_data.get("description"),
                    poll_data.get("startTime"),
                    poll_data.get("endTime"),
                    poll_data.get("acctSigner"),
                    poll_data.get("acctPollAccount"),
                    poll_data.get("blockNumber", 0),
                    poll_data.get("blockNumber", 0),
                    poll_data.get("trxHash"),
                ),
            )
            conn.commit()
            logger.info(f"插入投票: {poll_data.get('name')}")
    except Exception as e:
        logger.error(f"插入投票失败: {e}")


def insert_candidate(conn, candidate_data):
    """插入候选数据"""
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO candidates (id, name, poll_id, created_at, block_number, transaction_hash)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING
            """,
                (
                    candidate_data.get(
                        "acctCandidateAccount"
                    ),  # 使用 candidate account 作为 ID
                    candidate_data.get("candidateName"),
                    candidate_data.get("acctPollAccount"),
                    candidate_data.get("blockNumber", 0),
                    candidate_data.get("blockNumber", 0),
                    candidate_data.get("trxHash"),
                ),
            )
            conn.commit()
            logger.info(f"插入候选人: {candidate_data.get('candidateName')}")
    except Exception as e:
        logger.error(f"插入候选人失败: {e}")


def insert_vote(conn, vote_data):
    """插入投票数据"""
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO votes (id, voter, poll_id, candidate_id, created_at, block_number, transaction_hash)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING
            """,
                (
                    vote_data.get("acctVoterReceipt"),  # 使用 voter receipt 作为 ID
                    vote_data.get("acctSigner"),
                    vote_data.get("acctPollAccount"),
                    vote_data.get("acctCandidateAccount"),
                    vote_data.get("blockNumber", 0),
                    vote_data.get("blockNumber", 0),
                    vote_data.get("trxHash"),
                ),
            )
            conn.commit()
            logger.info(
                f"插入投票: {vote_data.get('acctSigner')} -> {vote_data.get('acctCandidateAccount')}"
            )
    except Exception as e:
        logger.error(f"插入投票失败: {e}")


def process_substreams_data():
    """处理 Substreams 数据"""
    conn = connect_db()
    if not conn:
        return

    try:
        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue

            try:
                data = json.loads(line)

                # 检查是否有 @data 字段
                if "@data" in data:
                    data = data["@data"]

                # 处理投票数据
                if "initializePollInstructionList" in data:
                    for poll in data["initializePollInstructionList"]:
                        insert_poll(conn, poll)

                # 处理候选数据
                if "addCandidateInstructionList" in data:
                    for candidate in data["addCandidateInstructionList"]:
                        insert_candidate(conn, candidate)

                # 处理投票数据
                if "voteInstructionList" in data:
                    for vote in data["voteInstructionList"]:
                        insert_vote(conn, vote)

            except json.JSONDecodeError as e:
                logger.warning(f"JSON 解析失败: {e}")
                continue

    except KeyboardInterrupt:
        logger.info("处理被中断")
    finally:
        conn.close()


if __name__ == "__main__":
    logger.info("启动 Substreams 数据处理器...")
    process_substreams_data()
