#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
import json
from typing import List, Dict, Optional
from pyrfc import Connection
from dotenv import load_dotenv
from work_order_image import generate_work_order_image

# 加载环境变量
load_dotenv()

# 设置输出编码为UTF-8
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

# SAP连接配置
SAP_CONFIG = {
    "ashost": "192.168.202.40",
    "sysnr": "00",
    "client": "100",
    "user": os.getenv('SAP_RFC_USERNAME'),
    "passwd": os.getenv('SAP_RFC_PASSWORD'),
    "lang": "ZH"
}

def connect_sap() -> Optional[Connection]:
    """建立SAP RFC连接"""
    try:
        conn = Connection(**SAP_CONFIG)
        return conn
    except Exception as e:
        return None

def read_sap_table(conn: Connection, table_name: str, fields: List[str], where_clause: str, max_rows: int = 100) -> List[Dict]:
    """读取SAP表数据"""
    try:
        result = conn.call(
            "RFC_READ_TABLE",
            QUERY_TABLE=table_name,
            DELIMITER="|",
            FIELDS=[{"FIELDNAME": f} for f in fields],
            OPTIONS=[{"TEXT": where_clause}] if where_clause else [],
            ROWCOUNT=max_rows
        )
        
        data = []
        if not result["DATA"]:
            return data
        
        field_index = {f["FIELDNAME"]: i for i, f in enumerate(result["FIELDS"])}
        for row in result["DATA"]:
            row_data = row["WA"].split("|")
            if len(row_data) < len(field_index):
                continue
            row_dict = {field: row_data[field_index[field]].strip() for field in fields}
            data.append(row_dict)
        
        return data
    except Exception as e:
        return []

def get_production_order_data(conn: Connection, aufnr: str) -> Optional[Dict]:
    """获取生产订单全量数据"""
    formatted_order_number = aufnr.zfill(12)
    
    # 1. 读取订单抬头（AUFK）
    aufk_fields = ["AUFNR", "AUART", "KDAUF", "KDPOS", "ERNAM", "ERDAT", "OBJNR", "WERKS", "LOEKZ"]
    aufk_where = f"AUFNR = '{formatted_order_number}' AND LOEKZ = ''"
    aufk_data = read_sap_table(conn, "AUFK", aufk_fields, aufk_where)
    if not aufk_data:
        return None
    aufk = aufk_data[0]

    # 2. 读取生产订单主数据（AFKO）
    afko_fields = ["AUFNR", "GSTRP", "GLTRP", "GAMNG", "GMEIN", "PLNBEZ", "DISPO", "FEVOR", "AUFPL"]
    afko_where = f"AUFNR = '{formatted_order_number}'"
    afko_data = read_sap_table(conn, "AFKO", afko_fields, afko_where)
    if not afko_data:
        return None
    afko = afko_data[0]

    # 3. 读取工序数据（AFVC）
    aufpl = afko["AUFPL"]
    afvc_fields = ["AUFPL", "VORNR", "LTXA1", "ARBID", "OBJNR", "STEUS", "APLZL"]
    afvc_where = f"AUFPL = '{aufpl}'"
    afvc_data = read_sap_table(conn, "AFVC", afvc_fields, afvc_where)
    if not afvc_data:
        return None

    # 4. 处理工序信息
    工序列表 = []
    for afvc in afvc_data:
        # 读取工作中心
        arbpl = ""
        ktext = ""
        if afvc.get("ARBID"):
            crhd_fields = ["OBJID", "ARBPL"]
            crhd_where = f"OBJID = '{afvc['ARBID']}'"
            crhd_data = read_sap_table(conn, "CRHD", crhd_fields, crhd_where, max_rows=1)
            arbpl = crhd_data[0]["ARBPL"] if crhd_data else ""
            
            crtx_fields = ["OBJID", "KTEXT"]
            crtx_where = f"OBJID = '{afvc['ARBID']}'"
            crtx_data = read_sap_table(conn, "CRTX", crtx_fields, crtx_where, max_rows=1)
            ktext = crtx_data[0]["KTEXT"] if crtx_data else ""

        # 读取工时数据（AFVV）
        afvv_fields = ["VGW01", "VGE01", "VGW02", "VGE02", "VGW03", "VGE03", "VGW04", "VGE04", "BMSCH"]
        afvv_where = f"AUFPL = '{aufpl}' AND APLZL = '{afvc['APLZL']}'"
        afvv_data = read_sap_table(conn, "AFVV", afvv_fields, afvv_where, max_rows=1)
        
        工时数据 = {"准备工时": "", "人工工时": "", "机器工时": "", "加工工时": ""}
        if afvv_data:
            afvv = afvv_data[0]
            bmsch = float(afvv["BMSCH"]) if afvv["BMSCH"] else 1
            工时数据 = {
                "准备工时": f"{float(afvv['VGW01'])/bmsch:.3f} {afvv['VGE01']}" if afvv["VGW01"] else "",
                "人工工时": f"{float(afvv['VGW02'])/bmsch:.3f} {afvv['VGE02']}" if afvv["VGW02"] else "",
                "机器工时": f"{float(afvv['VGW03'])/bmsch:.3f} {afvv['VGE03']}" if afvv["VGW03"] else "",
                "加工工时": f"{float(afvv['VGW04'])/bmsch:.3f} {afvv['VGE04']}" if afvv["VGW04"] else ""
            }

        # 读取员工分配（ZAFVC）
        zafvc_fields = ["AUFNR", "VORNR", "PERNR", "PERNM", "ASENG", "PEROR", "REMAK"]
        zafvc_where = f"AUFNR = '{formatted_order_number}' AND VORNR = '{afvc['VORNR']}'"
        zafvc_data = read_sap_table(conn, "ZAFVC", zafvc_fields, zafvc_where)

        工序列表.append({
            "工序号": afvc["VORNR"],
            "工序描述": afvc["LTXA1"],
            "控制码": afvc["STEUS"],
            "工作中心编号": arbpl,
            "工作中心描述": ktext,
            "工时数据": 工时数据,
            "下一道工序": None,
            "员工分配": zafvc_data if zafvc_data else []
        })

    # 按工序号排序
    工序列表.sort(key=lambda x: x["工序号"])
    
    # 设置下一道工序
    for i, 工序 in enumerate(工序列表):
        if i < len(工序列表) - 1:
            下一道工序 = 工序列表[i + 1]
            工序["下一道工序"] = {
                "工序号": 下一道工序["工序号"],
                "工序描述": 下一道工序["工序描述"],
                "控制码": 下一道工序["控制码"],
                "工作中心编号": 下一道工序["工作中心编号"],
                "工作中心描述": 下一道工序["工作中心描述"]
            }

    # 5. 读取物料描述（MAKT）和图号（MARA）
    maktx = "无物料描述"
    zpictx = ""
    matnr = afko["PLNBEZ"]
    if matnr:
        makt_fields = ["MATNR", "MAKTX"]
        makt_where = f"MATNR = '{matnr}' AND SPRAS = '1'"
        makt_data = read_sap_table(conn, "MAKT", makt_fields, makt_where, max_rows=1)
        maktx = makt_data[0]["MAKTX"] if makt_data else "无物料描述"
        
        # 读取图号信息（MARA）
        mara_fields = ["ZPICTX"]
        mara_where = f"MATNR = '{matnr}'"
        mara_data = read_sap_table(conn, "MARA", mara_fields, mara_where, max_rows=1)
        zpictx = mara_data[0]["ZPICTX"] if mara_data else ""

    # 整合结果
    return {
        "基础信息": {
            "工单号": aufk["AUFNR"],
            "订单类型": aufk["AUART"],
            "销售订单": aufk["KDAUF"],
            "销售订单行项目": aufk["KDPOS"],
            "工厂": aufk["WERKS"],
            "创建人": aufk["ERNAM"],
            "创建日期": aufk["ERDAT"],
            "客户名称": ""
        },
        "生产信息": {
            "物料号": matnr,
            "物料描述": maktx,
            "图号": zpictx,
            "开始日期": afko["GSTRP"],
            "结束日期": afko["GLTRP"],
            "生产数量": afko["GAMNG"],
            "单位": afko["GMEIN"],
            "库存地点": "",
            "库存地点描述": "",
            "MRP控制者": afko["DISPO"],
            "生产管理员": afko["FEVOR"]
        },
        "模具信息": [],
        "工序与员工分配": 工序列表
    }

def get_work_order_report(order_number):
    """获取工序报工单数据并生成图片"""
    try:
        conn = connect_sap()
        if not conn:
            return {'success': False, 'error': 'SAP连接失败'}
        
        try:
            order_data = get_production_order_data(conn, order_number)
            if not order_data:
                return {'success': False, 'error': '未找到工单数据'}
            
            # 生成图片
            image_base64 = generate_work_order_image(order_data)
            
            return {
                'success': True,
                'order_data': order_data,
                'image': image_base64
            }
        finally:
            conn.close()
            
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(json.dumps({'success': False, 'error': '请提供工单号参数'}))
        sys.exit(1)
    
    order_number = sys.argv[1].strip()
    result = get_work_order_report(order_number)
    print(json.dumps(result, ensure_ascii=False))