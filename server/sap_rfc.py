#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
import json
from pyrfc import Connection
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 设置输出编码为UTF-8
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

def remove_leading_zeros(value):
    """去除数字字符串的前导零，但保留至少一位数字"""
    if value and value.isdigit():
        return str(int(value))
    return value

def parse_table_data(data, fields):
    """解析 SAP RFC_READ_TABLE 返回的数据"""
    parsed_data = []
    for row in data:
        item = {}
        raw_data = row['WA']
        
        for field in fields:
            offset = int(field['OFFSET'])
            length = int(field['LENGTH'])
            value = raw_data[offset:offset+length].strip()
            
            # 处理数字类型
            if field['TYPE'] == 'P' and value:  # 压缩数字
                try:
                    value = float(value.replace(' ', ''))
                except:
                    value = 0.0
            elif field['TYPE'] == 'N' and value:  # 数字字符串
                try:
                    value = str(int(value))
                except:
                    pass  # 保持原样
            
            item[field['FIELDNAME']] = value
        
        parsed_data.append(item)
    
    return parsed_data

def get_order_details(order_number):
    """获取工单详情"""
    try:
        # SAP连接参数从环境变量获取
        conn_params = {
            'ashost': '192.168.202.40',
            'sysnr': '00',
            'client': '100',
            'user': os.getenv('SAP_RFC_USERNAME'),
            'passwd': os.getenv('SAP_RFC_PASSWORD'),
            'lang': 'ZH'
        }
        
        # 确保订单号有正确的格式（添加前导零到12位）
        formatted_order_number = order_number.zfill(12)
        
        with Connection(**conn_params) as conn:
            # 1. 获取产成品信息
            afko_result = conn.call('RFC_READ_TABLE',
                                   QUERY_TABLE='AFKO',
                                   OPTIONS=[{"TEXT": f"AUFNR = '{formatted_order_number}'"}],
                                   FIELDS=['PLNBEZ', 'GAMNG', 'GMEIN'])
            
            finished_product = {}
            if afko_result['DATA']:
                afko_data = parse_table_data(afko_result['DATA'], afko_result['FIELDS'])
                if afko_data and 'PLNBEZ' in afko_data[0]:
                    # 去除产成品物料码的前导零
                    finished_product_matnr = remove_leading_zeros(afko_data[0]['PLNBEZ'])
                    
                    finished_product = {
                        'matnr': finished_product_matnr,
                        'quantity': afko_data[0].get('GAMNG', ''),
                        'unit': afko_data[0].get('GMEIN', '')
                    }
            
            # 获取产成品描述
            if finished_product.get('matnr'):
                # 查询描述时需要完整的物料码（带前导零）
                makt_result = conn.call('RFC_READ_TABLE',
                                       QUERY_TABLE='MAKT',
                                       OPTIONS=[{"TEXT": f"MATNR = '{afko_data[0]['PLNBEZ']}'"}],
                                       FIELDS=['MAKTX'])
                
                if makt_result['DATA']:
                    makt_data = parse_table_data(makt_result['DATA'], makt_result['FIELDS'])
                    if makt_data and 'MAKTX' in makt_data[0]:
                        finished_product['description'] = makt_data[0]['MAKTX']
            
            # 2. 获取组件信息
            resb_result = conn.call('RFC_READ_TABLE',
                                   QUERY_TABLE='RESB',
                                   OPTIONS=[{"TEXT": f"AUFNR = '{formatted_order_number}'"}],
                                   FIELDS=['RSNUM', 'MATNR', 'BDMNG', 'MEINS', 'ENMNG', 'POSNR'])
            
            components = []
            if resb_result['DATA']:
                resb_data = parse_table_data(resb_result['DATA'], resb_result['FIELDS'])
                
                # 获取所有组件物料描述
                matnr_list = list(set([item['MATNR'] for item in resb_data if item['MATNR']]))
                descriptions = {}
                
                for matnr in matnr_list:
                    makt_result = conn.call('RFC_READ_TABLE',
                                           QUERY_TABLE='MAKT',
                                           OPTIONS=[{"TEXT": f"MATNR = '{matnr}'"}],
                                           FIELDS=['MAKTX'])
                    
                    if makt_result['DATA']:
                        makt_data = parse_table_data(makt_result['DATA'], makt_result['FIELDS'])
                        if makt_data and 'MAKTX' in makt_data[0]:
                            descriptions[matnr] = makt_data[0]['MAKTX']
                
                # 构建组件列表
                for item in resb_data:
                    # 去除组件物料码的前导零
                    clean_matnr = remove_leading_zeros(item['MATNR'])
                    
                    components.append({
                        'matnr': clean_matnr,
                        'description': descriptions.get(item['MATNR'], '无描述'),
                        'required_qty': item['BDMNG'],
                        'unit': item['MEINS'],
                    })
            
            # 3. 返回结构化数据
            return {
                'success': True,
                'order_number': order_number,  # 返回原始订单号（不带前导零）
                'finished_product': finished_product,
                'components': components
            }
            
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
    result = get_order_details(order_number)
    print(json.dumps(result, ensure_ascii=False))