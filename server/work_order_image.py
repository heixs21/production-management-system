#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import base64
import io
from PIL import Image, ImageDraw, ImageFont
from barcode import Code128
from barcode.writer import ImageWriter

def generate_work_order_image(order_data):
    """生成工序报工单图片并返回base64编码"""
    # 动态计算图片高度
    base_height = 400
    operation_height = 220
    mold_height = 40
    total_height = base_height + len(order_data.get("工序与员工分配", [])) * operation_height + len(order_data.get("模具信息", [])) * mold_height
    width = 800
    
    image = Image.new("RGB", (width, total_height), "white")
    draw = ImageDraw.Draw(image)
    
    # 加载项目内的中文字体
    import os
    script_dir = os.path.dirname(os.path.abspath(__file__))
    font_paths = [
        os.path.join(script_dir, "fonts", "simhei.ttf"),
        os.path.join(script_dir, "fonts", "msyh.ttc"),
        os.path.join(script_dir, "fonts", "NotoSansCJK-Regular.ttc")
    ]
    
    font_title = None
    font_subtitle = None
    font_content = None
    
    for font_path in font_paths:
        try:
            if os.path.exists(font_path):
                font_title = ImageFont.truetype(font_path, 22)
                font_subtitle = ImageFont.truetype(font_path, 16)
                font_content = ImageFont.truetype(font_path, 14)
                break
        except:
            continue
    
    # 如果没有找到字体文件，使用默认字体
    if not font_title:
        font_title = ImageFont.load_default()
        font_subtitle = ImageFont.load_default()
        font_content = ImageFont.load_default()
    
    # 绘制标题
    draw.text((width // 2, 30), "和泰机电股份有限公司", fill="black", font=font_title, anchor="mm")
    draw.line([(50, 50), (width - 50, 50)], fill="black", width=2)
    draw.text((width // 2, 70), "工序报工单", fill="black", font=font_title, anchor="mm")
    
    # 绘制基础信息
    y = 100
    基础信息 = order_data.get("基础信息", {})
    draw.text((50, y), f"生产订单: {基础信息.get('工单号', '')}", fill="black", font=font_content)
    draw.text((400, y), f"订单类型: {基础信息.get('订单类型', '')}", fill="black", font=font_content)
    y += 25
    draw.text((50, y), f"销售订单: {基础信息.get('销售订单', '')} 行项目: {基础信息.get('销售订单行项目', '')}", fill="black", font=font_content)
    draw.text((400, y), f"客户名称: {基础信息.get('客户名称', '')}", fill="black", font=font_content)
    y += 25
    draw.text((50, y), f"工厂: {基础信息.get('工厂', '')}", fill="black", font=font_content)
    draw.text((400, y), f"创建人: {基础信息.get('创建人', '')} 日期: {基础信息.get('创建日期', '')}", fill="black", font=font_content)
    y += 25
    
    # 绘制生产信息
    draw.line([(50, y + 5), (width - 50, y + 5)], fill="black", width=1)
    y += 15
    draw.text((50, y), "生产信息:", fill="black", font=font_subtitle)
    y += 20
    生产信息 = order_data.get("生产信息", {})
    draw.text((70, y), f"物料编码: {生产信息.get('物料号', '')}", fill="black", font=font_content)
    draw.text((400, y), f"图号: {生产信息.get('图号', '')}", fill="black", font=font_content)
    y += 20
    draw.text((70, y), f"物料描述: {生产信息.get('物料描述', '')}", fill="black", font=font_content)
    y += 20
    draw.text((70, y), f"生产数量: {生产信息.get('生产数量', '')} {生产信息.get('单位', '')}", fill="black", font=font_content)
    draw.text((400, y), f"库存地点: {生产信息.get('库存地点', '')} {生产信息.get('库存地点描述', '')}", fill="black", font=font_content)
    y += 20
    draw.text((70, y), f"开始: {生产信息.get('开始日期', '')}", fill="black", font=font_content)
    draw.text((400, y), f"MRP控制者: {生产信息.get('MRP控制者', '')}", fill="black", font=font_content)
    y += 20
    draw.text((70, y), f"完成: {生产信息.get('结束日期', '')}", fill="black", font=font_content)
    draw.text((400, y), f"生产管理员: {生产信息.get('生产管理员', '')}", fill="black", font=font_content)
    y += 20
    
    # 绘制模具信息
    模具信息 = order_data.get("模具信息", [])
    if 模具信息:
        draw.line([(50, y + 5), (width - 50, y + 5)], fill="black", width=1)
        y += 15
        draw.text((50, y), "模具信息:", fill="black", font=font_subtitle)
        y += 20
        for mold in 模具信息:
            draw.text((70, y), f"物料号: {mold.get('物料号', '')}，描述: {mold.get('描述', '')}，数量: {mold.get('数量', '')} {mold.get('单位', '')}", fill="black", font=font_content)
            y += 20
    
    # 绘制工序信息
    draw.line([(50, y + 5), (width - 50, y + 5)], fill="black", width=1)
    y += 15
    draw.text((50, y), "工序信息:", fill="black", font=font_subtitle)
    y += 25
    
    工序列表 = order_data.get("工序与员工分配", [])
    for idx, 工序 in enumerate(工序列表, 1):
        draw.line([(70, y), (width - 70, y)], fill="#dddddd", width=1)
        y += 15
        
        draw.text((70, y), f"工序 {idx}: {工序.get('工序号', '')} {工序.get('工序描述', '')}", fill="black", font=font_subtitle)
        y += 20
        draw.text((90, y), f"控制码: {工序.get('控制码', '')}", fill="black", font=font_content)
        draw.text((300, y), f"工作中心: {工序.get('工作中心编号', '')}（{工序.get('工作中心描述', '')}）", fill="black", font=font_content)
        y += 20
        
        # 工时数据
        工时数据 = 工序.get('工时数据', {})
        draw.text((90, y), "工时数据:", fill="black", font=font_content)
        y += 18
        draw.text((110, y), f"准备工时: {工时数据.get('准备工时', '')}", fill="black", font=font_content)
        draw.text((350, y), f"人工工时: {工时数据.get('人工工时', '')}", fill="black", font=font_content)
        y += 18
        draw.text((110, y), f"机器工时: {工时数据.get('机器工时', '')}", fill="black", font=font_content)
        draw.text((350, y), f"加工工时: {工时数据.get('加工工时', '')}", fill="black", font=font_content)
        y += 20
        
        # 下一道工序
        下一道工序 = 工序.get("下一道工序")
        if 下一道工序:
            draw.text((90, y), f"下一道工序: {下一道工序.get('工序号', '')} {下一道工序.get('工序描述', '')}", fill="black", font=font_content)
            draw.text((90, y + 18), f"下道工作中心: {下一道工序.get('工作中心编号', '')}（{下一道工序.get('工作中心描述', '')}）", fill="black", font=font_content)
            y += 36
        else:
            draw.text((90, y), "下一道工序: 无（最终工序）", fill="black", font=font_content)
            y += 18
        
        # 员工分配
        draw.text((90, y), "员工分配:", fill="black", font=font_content)
        y += 18
        员工分配 = 工序.get("员工分配", [])
        if isinstance(员工分配, list) and 员工分配:
            for emp in 员工分配:
                draw.text((110, y), f"人员号: {emp.get('PERNR', '')}，姓名: {emp.get('PERNM', '')}，分配数量: {emp.get('ASENG', '')}", fill="black", font=font_content)
                y += 18
        else:
            draw.text((110, y), "无员工分配", fill="black", font=font_content)
            y += 18
        
        # 生成条形码
        工单号 = 基础信息.get('工单号', '').replace('000000', '')
        工序号 = 工序.get('工序号', '').zfill(4)
        barcode_text = f"{工单号}{工序号}"
        
        try:
            # 生成条形码图片
            code = Code128(barcode_text, writer=ImageWriter())
            barcode_buffer = io.BytesIO()
            code.write(barcode_buffer, options={'write_text': False, 'module_height': 15, 'module_width': 0.4})
            barcode_buffer.seek(0)
            barcode_img = Image.open(barcode_buffer)
            
            # 设置条形码大小
            barcode_width = 400
            barcode_height = 60
            barcode_img = barcode_img.resize((barcode_width, barcode_height))
            
            # 居中显示条形码
            barcode_x = (width - barcode_width) // 2
            image.paste(barcode_img, (barcode_x, y))
            
            y += barcode_height + 10
        except:
            # 如果条形码生成失败，居中显示文本
            draw.text((width // 2, y), f"#{barcode_text}#", fill="black", font=font_content, anchor="mm")
            y += 25
        
        y += 10
    
    # 转换为base64
    buffer = io.BytesIO()
    image.save(buffer, format='PNG')
    buffer.seek(0)
    image_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
    
    return image_base64