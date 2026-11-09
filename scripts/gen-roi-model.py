#!/usr/bin/env python3
"""
生成 1.4 会员下载模板：投资回报模型（10 年现金流、IRR、Cap Rate）。
用法：python3 -m venv .venv && .venv/bin/pip install openpyxl==3.1.5 && .venv/bin/python scripts/gen-roi-model.py
输出：private/tools/sarec-roi-model-v1.xlsx（不放 public/，只能经会员下载接口取）
全部用 Excel 公式，改蓝色输入格即可重算。仅供参考，不构成投资或贷款建议。
"""
import os
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

OUT = os.path.join(os.path.dirname(__file__), '..', 'private', 'tools', 'sarec-roi-model-v1.xlsx')
NAVY, GOLD, IVORY = '071B2C', 'C8A15A', 'F7F3EB'
INPUT_FONT = Font(name='Arial', color='1F4FBF', bold=True)
H_FONT = Font(name='Arial', color='FFFFFF', bold=True)
T_FONT = Font(name='Arial', size=16, bold=True, color=NAVY)
B_FONT = Font(name='Arial')
BOLD = Font(name='Arial', bold=True)
NAVY_FILL = PatternFill('solid', fgColor=NAVY)
IN_FILL = PatternFill('solid', fgColor='EEF3FF')
SUM_FILL = PatternFill('solid', fgColor=IVORY)
thin = Side(style='thin', color='D9D2C3')
BOX = Border(top=thin, bottom=thin, left=thin, right=thin)
USD = '"$"#,##0;[Red]-"$"#,##0'
PCT = '0.00%'
DISCLAIMER = '仅供参考，不构成投资或贷款建议。For reference only. Not investment or lending advice.'

wb = Workbook()

# —— 说明 ——
g = wb.active
g.title = '说明 Guide'
g.column_dimensions['A'].width = 100
rows = [
    ('SAREC 投资回报模型 · Investment Return Model (v1)', T_FONT),
    ('中美房地产商会会员专用模板 · SAREC member template', BOLD),
    ('', None),
    ('怎么用 How to use', BOLD),
    ('1. 只改「输入 Inputs」页的蓝色格子（房价、首付、利率、租金、费用、增长率等）。Edit only the blue cells on the Inputs sheet.', B_FONT),
    ('2. 「现金流 Cash Flow」页自动算出 10 年现金流、第 10 年卖出净额、IRR、Cap Rate、现金回报率、DSCR。The Cash Flow sheet recalculates automatically.', B_FONT),
    ('3. 第 0 年为投入现金（首付 + 过户费用 + 初始装修），第 10 年按假设增值率卖出并还清贷款余额。Year 0 = cash invested; year 10 includes sale net of selling costs and loan payoff.', B_FONT),
    ('', None),
    ('口径说明 Assumptions', BOLD),
    ('· Cap Rate = 第 1 年净营运收入（NOI）÷ 房价。Cap rate = Year-1 NOI ÷ purchase price.', B_FONT),
    ('· 现金回报率 = 第 1 年税前现金流 ÷ 投入现金。Cash-on-cash = Year-1 pre-tax cash flow ÷ cash invested.', B_FONT),
    ('· IRR 为税前、未计所得税、折旧抵税、资本利得税和 1031 递延。IRR is pre-tax; excludes income tax, depreciation benefit, capital gains tax and 1031 deferral.', B_FONT),
    ('· 增长率、空置率、费用率都是假设，实际数字以市场、贷款机构和会计师为准。All growth/vacancy/expense rates are assumptions; verify with market data, your lender and CPA.', B_FONT),
    ('', None),
    (DISCLAIMER, Font(name='Arial', bold=True, color='9C2B2B')),
]
for i, (text, font) in enumerate(rows, 1):
    c = g.cell(row=i, column=1, value=text)
    if font:
        c.font = font
    c.alignment = Alignment(wrap_text=True, vertical='top')

# —— 输入 ——
s = wb.create_sheet('输入 Inputs')
s.column_dimensions['A'].width = 44
s.column_dimensions['B'].width = 18
s.column_dimensions['C'].width = 46
s['A1'] = '输入 Inputs（只改蓝色格子 · edit blue cells only）'
s['A1'].font = T_FONT
for col, h in zip('ABC', ['项目 Item', '数值 Value', '说明 Note']):
    s[f'{col}3'] = h
    s[f'{col}3'].font = H_FONT
    s[f'{col}3'].fill = NAVY_FILL

INPUTS = [
    # key, label, value, fmt, note
    ('price', '房价 Purchase price', 1_000_000, USD, ''),
    ('closing', '过户等一次性费用 Closing costs (% of price)', 0.02, PCT, ''),
    ('capex', '初始装修 Initial renovation', 0, USD, ''),
    ('down', '首付比例 Down payment %', 0.25, PCT, ''),
    ('rate', '贷款年利率 Interest rate', 0.065, PCT, ''),
    ('term', '贷款年限 Loan term (years)', 30, '0', ''),
    ('rent', '月租金 Monthly rent', 5_500, USD, '第 1 年 · Year 1'),
    ('other', '其他月收入 Other monthly income', 0, USD, '车位、储物等 · parking, storage'),
    ('vacancy', '空置率 Vacancy %', 0.05, PCT, '按总收入 · of gross income'),
    ('tax', '房产税率 Property tax % (of price)', 0.011, PCT, ''),
    ('ins', '保险 Insurance % (of price)', 0.0035, PCT, ''),
    ('hoa', 'HOA（每月）HOA monthly', 0, USD, ''),
    ('maint', '维修 Maintenance % of rent', 0.05, PCT, ''),
    ('mgmt', '物业管理 Management % of collected income', 0.08, PCT, ''),
    ('rentg', '租金年增长 Rent growth / yr', 0.03, PCT, ''),
    ('expg', '费用年增长 Expense growth / yr', 0.03, PCT, ''),
    ('appr', '房价年增值 Appreciation / yr', 0.03, PCT, '假设 · assumption'),
    ('sell', '卖出费用 Selling costs % (year 10)', 0.06, PCT, '佣金、过户 · commission, escrow'),
]
REF = {}
r = 4
for key, label, val, fmt, note in INPUTS:
    s.cell(row=r, column=1, value=label).font = B_FONT
    c = s.cell(row=r, column=2, value=val)
    c.font, c.fill, c.number_format, c.border = INPUT_FONT, IN_FILL, fmt, BOX
    s.cell(row=r, column=3, value=note).font = Font(name='Arial', color='6E7C88')
    REF[key] = f"'输入 Inputs'!$B${r}"
    r += 1

dv = DataValidation(type='decimal', operator='between', formula1='0', formula2='1', allow_blank=False,
                    error='请输入 0%–100% · Enter 0%–100%')
s.add_data_validation(dv)
for key in ('closing', 'down', 'rate', 'vacancy', 'tax', 'ins', 'maint', 'mgmt', 'sell'):
    dv.add(REF[key].split('!')[1].replace('$', ''))

r += 1
s.cell(row=r, column=1, value='自动计算 Derived').font = BOLD
r += 1
DERIVED = [
    ('loan', '贷款金额 Loan amount', f"={REF['price']}*(1-{REF['down']})", USD),
    ('dp', '首付 Down payment', f"={REF['price']}*{REF['down']}", USD),
    ('cash', '投入现金合计 Total cash invested', None, USD),
    ('pi', '月供（本息）Monthly P&I', None, USD),
    ('ds', '年还款 Annual debt service', None, USD),
]
for key, label, f, fmt in DERIVED:
    REF[key] = f"'输入 Inputs'!$B${r}"
    if key == 'cash':
        f = f"={REF['dp']}+{REF['price']}*{REF['closing']}+{REF['capex']}"
    if key == 'pi':
        f = f"=IF({REF['loan']}<=0,0,PMT({REF['rate']}/12,{REF['term']}*12,-{REF['loan']}))"
    if key == 'ds':
        f = f"={REF['pi']}*12"
    s.cell(row=r, column=1, value=label).font = B_FONT
    c = s.cell(row=r, column=2, value=f)
    c.number_format, c.border, c.fill, c.font = fmt, BOX, SUM_FILL, BOLD
    r += 1
s.cell(row=r + 1, column=1, value=DISCLAIMER).font = Font(name='Arial', italic=True, color='9C2B2B')
s.freeze_panes = 'A4'

# —— 现金流 ——
cf = wb.create_sheet('现金流 Cash Flow')
cf.column_dimensions['A'].width = 40
for i in range(2, 13):
    cf.column_dimensions[get_column_letter(i)].width = 14
cf['A1'] = '10 年现金流 · 10-Year Cash Flow（税前 pre-tax）'
cf['A1'].font = T_FONT
cf['A3'] = '年份 Year'
cf['A3'].font, cf['A3'].fill = H_FONT, NAVY_FILL
YEARS = list(range(0, 11))
col = {y: get_column_letter(2 + y) for y in YEARS}
for y in YEARS:
    c = cf[f'{col[y]}3']
    c.value, c.font, c.fill, c.alignment = y, H_FONT, NAVY_FILL, Alignment(horizontal='center')

LINES = [
    ('gross', '租金收入 Gross rent'),
    ('oth', '其他收入 Other income'),
    ('vac', '空置损失 Vacancy loss'),
    ('egi', '有效总收入 Effective gross income'),
    ('ptax', '房产税 Property tax'),
    ('pins', '保险 Insurance'),
    ('phoa', 'HOA'),
    ('pmaint', '维修 Maintenance'),
    ('pmgmt', '物业管理 Management'),
    ('opex', '营运费用合计 Total operating expenses'),
    ('noi', '净营运收入 NOI'),
    ('debt', '还款 Debt service'),
    ('cfbt', '税前现金流 Cash flow before tax'),
    ('bal', '年末贷款余额 Loan balance (end of year)'),
    ('val', '房产价值 Property value'),
    ('sale', '卖出净额 Net sale proceeds'),
    ('total', '总现金流 Total cash flow (for IRR)'),
]
ROW = {}
for i, (k, label) in enumerate(LINES):
    ROW[k] = 4 + i
    cf.cell(row=ROW[k], column=1, value=label).font = BOLD if k in ('egi', 'opex', 'noi', 'cfbt', 'total') else B_FONT

for y in YEARS:
    c = col[y]
    def put(k, f):
        cell = cf[f'{c}{ROW[k]}']
        cell.value, cell.number_format, cell.font = f, USD, B_FONT
        if k in ('egi', 'noi', 'cfbt', 'total'):
            cell.fill, cell.font = SUM_FILL, BOLD
    if y == 0:
        put('val', f"={REF['price']}")
        put('bal', f"={REF['loan']}")
        put('total', f"=-{REF['cash']}")
        continue
    gy = f'(1+{REF["rentg"]})^({y}-1)'
    ey = f'(1+{REF["expg"]})^({y}-1)'
    put('gross', f"={REF['rent']}*12*{gy}")
    put('oth', f"={REF['other']}*12*{gy}")
    put('vac', f"=-({c}{ROW['gross']}+{c}{ROW['oth']})*{REF['vacancy']}")
    put('egi', f"=SUM({c}{ROW['gross']}:{c}{ROW['vac']})")
    put('ptax', f"=-{REF['price']}*{REF['tax']}*{ey}")
    put('pins', f"=-{REF['price']}*{REF['ins']}*{ey}")
    put('phoa', f"=-{REF['hoa']}*12*{ey}")
    put('pmaint', f"=-{c}{ROW['gross']}*{REF['maint']}")
    put('pmgmt', f"=-{c}{ROW['egi']}*{REF['mgmt']}")
    put('opex', f"=SUM({c}{ROW['ptax']}:{c}{ROW['pmgmt']})")
    put('noi', f"={c}{ROW['egi']}+{c}{ROW['opex']}")
    put('debt', f"=IF({y}<={REF['term']},-{REF['ds']},0)")
    put('cfbt', f"={c}{ROW['noi']}+{c}{ROW['debt']}")
    put('bal', f"=IF(OR({REF['loan']}<=0,{y}>={REF['term']}),0,-FV({REF['rate']}/12,{y}*12,-{REF['pi']},{REF['loan']}))")
    put('val', f"={REF['price']}*(1+{REF['appr']})^{y}")
    if y == 10:
        put('sale', f"={c}{ROW['val']}*(1-{REF['sell']})-{c}{ROW['bal']}")
        put('total', f"={c}{ROW['cfbt']}+{c}{ROW['sale']}")
    else:
        put('total', f"={c}{ROW['cfbt']}")

m = ROW['total'] + 2
cf.cell(row=m, column=1, value='关键指标 Key metrics').font = T_FONT
first, last = col[0], col[10]
METRICS = [
    ('Cap Rate（第 1 年 NOI ÷ 房价）', f"=C{ROW['noi']}/{REF['price']}", PCT),
    ('现金回报率 Cash-on-cash（第 1 年）', f"=IF({REF['cash']}=0,\"—\",C{ROW['cfbt']}/{REF['cash']})", PCT),
    ('偿债覆盖率 DSCR（第 1 年）', f"=IF({REF['ds']}=0,\"—\",C{ROW['noi']}/{REF['ds']})", '0.00"x"'),
    ('10 年 IRR（税前）10-yr IRR (pre-tax)', f"=IFERROR(IRR({first}{ROW['total']}:{last}{ROW['total']}),\"—\")", PCT),
    ('权益倍数 Equity multiple', f"=IF({REF['cash']}=0,\"—\",SUM(C{ROW['total']}:{last}{ROW['total']})/{REF['cash']})", '0.00"x"'),
    ('10 年累计税前现金流 Cumulative cash flow', f"=SUM(C{ROW['cfbt']}:{last}{ROW['cfbt']})", USD),
]
for i, (label, f, fmt) in enumerate(METRICS, 1):
    cf.cell(row=m + i, column=1, value=label).font = BOLD
    c = cf.cell(row=m + i, column=2, value=f)
    c.number_format, c.font, c.fill, c.border = fmt, Font(name='Arial', bold=True, color=NAVY), SUM_FILL, BOX
cf.cell(row=m + len(METRICS) + 2, column=1, value=DISCLAIMER).font = Font(name='Arial', italic=True, color='9C2B2B')
cf.freeze_panes = 'B4'

wb.active = 0
os.makedirs(os.path.dirname(OUT), exist_ok=True)
wb.save(OUT)
print('wrote', os.path.abspath(OUT), 'metrics row', m + 1)
