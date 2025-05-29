from flask import Flask, request, jsonify, render_template
import pandas as pd
import threading
import webbrowser
import os
import re
import pickle
from difflib import get_close_matches

app = Flask(__name__, static_folder='static', static_url_path='/static')

DEFAULT_CONFIG = {
    'paths': {
        'input_excel': r'D:\chat_bot\PPR_LISTS_Registered Medicine Price List_20250119.xlsx'
    },
    'cleaning': {
        'col_rename': {
            'SR': 'sr',
            'DRUG REGISTRATION NUMBER': 'drug_reg_number',
            'MEDICINE NAME': 'medicine_name',
            'STRENGTH': 'strength',
            'UNIT OF STRENGTH': 'unit',
            'PHARMACEUTICAL FORM': 'pharma_form',
            'PACK SIZE': 'pack_size',
            'ROUTE OF ADMINISTRATION': 'route',
            'METHOD OF SALE/SUPPLY': 'sale_method',
            'PRODUCT TYPE': 'product_type',
            'ACTIVE SUBSTANCES': 'active_substances',
            'RETAIL PRICE\n BD': 'retail_price_bd',
            'SHELF-LIFE (MONTHS)': 'shelf_life_months',
            'AGENT NAME': 'agent_name',
            'MAH CODE': 'mah_code',
            'MAH NAME': 'mah_name',
            'BATCH RELEASING SITE NAME': 'batch_site',
            'INVOICING COMPANY CODE': 'invoicing_company_code',
            'INVOICING COMPANY (NAME & COUNTRY)': 'invoicing_company',
            'STORAGE CONDITIONS': 'storage_conditions'
        },
        'fillna': {
            'medicine_name': '',
            'active_substances': '',
            'unit': '',
            'pharma_form': 'tablet',
            'route': 'oral',
            'sale_method': 'POM',
            'product_type': 'STANDARD'
        }
    }
}

medicine_names = []
cache_file = 'data_cache.pkl'

def load_config():
    return DEFAULT_CONFIG

def load_and_clean_data(cfg):
    global medicine_names
    if os.path.exists(cache_file):
        try:
            with open(cache_file, 'rb') as f:
                df, medicine_names = pickle.load(f)
                return df
        except Exception:
            os.remove(cache_file)

    df = pd.read_excel(cfg['paths']['input_excel'])
    df.rename(columns=cfg['cleaning']['col_rename'], inplace=True)
    df.fillna(cfg['cleaning']['fillna'], inplace=True)
    medicine_names = df['medicine_name'].dropna().str.lower().unique().tolist()
    with open(cache_file, 'wb') as f:
        pickle.dump((df, medicine_names), f)
    return df

def correct_medicine_name(name):
    name_lower = name.lower()
    matches = get_close_matches(name_lower, medicine_names, n=1, cutoff=0.85)
    return matches[0] if matches else name_lower

def normalize_substance(sub):
    return ' '.join(sorted(sub.lower().replace(' ', '').split('+')))

def normalize_medicine_name(name):
    name = name.lower()
    name = re.sub(r'[^a-z0-9\s\-./\\@%&]', '', name)
    return re.sub(r'\s+', ' ', name).strip()

def get_strengths_for_medicine(df, med_name):
    medicines = df[df['medicine_name'].str.lower() == med_name.lower()]
    if medicines.empty:
        medicines = df[df['medicine_name'].str.contains(med_name, case=False, na=False)]
    if medicines.empty:
        return None, []
    first_match = medicines.iloc[0]
    strengths = medicines[['strength', 'unit']].drop_duplicates()
    return first_match['medicine_name'], strengths.to_dict(orient='records')

def get_alternatives(df, base_med_name, strength_value, unit, alt_type='cheaper'):
    base = df[
        (df['medicine_name'].str.lower() == base_med_name.lower()) &
        (df['strength'].astype(str) == strength_value) &
        (df['unit'].str.lower() == unit.lower())
    ]
    if base.empty:
        return []

    row = base.iloc[0]
    norm_active = normalize_substance(row['active_substances'])
    subs = df[
        (df['medicine_name'].str.lower() != base_med_name.lower()) &
        (df['strength'].astype(str) == strength_value) &
        (df['unit'].str.lower() == unit.lower()) &
        (df['pharma_form'].str.lower() == row['pharma_form'].lower())
    ]
    subs = subs[subs['active_substances'].apply(lambda x: normalize_substance(x) == norm_active)]

    if subs.empty:
        return []

    if alt_type == 'cheaper':
        result = subs[subs['retail_price_bd'] < row['retail_price_bd']].nsmallest(3, 'retail_price_bd')
    elif alt_type == 'expensive':
        result = subs[subs['retail_price_bd'] > row['retail_price_bd']].nlargest(3, 'retail_price_bd')
    else:
        result = subs.sample(n=min(3, len(subs)))

    return result[['medicine_name', 'strength', 'unit', 'retail_price_bd']].to_dict(orient='records')

def compare_medicines(df, med1, med2, strength1_value, unit1, strength2_value, unit2):
    one = df[
        (df['medicine_name'].str.lower() == med1.lower()) &
        (df['strength'].astype(str) == strength1_value) &
        (df['unit'].str.lower() == unit1.lower())
    ]
    two = df[
        (df['medicine_name'].str.lower() == med2.lower()) &
        (df['strength'].astype(str) == strength2_value) &
        (df['unit'].str.lower() == unit2.lower())
    ]
    if one.empty or two.empty:
        return []

    r1, r2 = one.iloc[0], two.iloc[0]
    fields = [
        ('Medicine Name', r1['medicine_name'], r2['medicine_name']),
        ('Retail Price BD', r1['retail_price_bd'], r2['retail_price_bd']),
        ('Active Substances', r1['active_substances'], r2['active_substances']),
        ('Strength', f"{r1['strength']} {r1['unit']}", f"{r2['strength']} {r2['unit']}"),
        ('Pharmaceutical Form', r1['pharma_form'], r2['pharma_form']),
        ('Pack Size', r1['pack_size'], r2['pack_size']),
        ('Storage Conditions', r1['storage_conditions'], r2['storage_conditions']),
        ('Shelf Life (months)', r1['shelf_life_months'], r2['shelf_life_months']),
    ]
    return [{'field': f, 'med1': m1_val, 'med2': m2_val} for (f, m1_val, m2_val) in fields]

def get_drug_info(df, med, strength_value, unit, fields):
    row = df[
        (df['medicine_name'].str.lower() == med.lower()) &
        (df['strength'].astype(str) == strength_value) &
        (df['unit'].str.lower() == unit.lower())
    ]
    if row.empty:
        return {}

    r = row.iloc[0]
    info_map = {
        'MEDICINE NAME': r['medicine_name'],
        'PHARMACEUTICAL FORM': r['pharma_form'],
        'PACK SIZE': r['pack_size'],
        'RETAIL PRICE BD': r['retail_price_bd'],
        'SHELF-LIFE (MONTHS)': r['shelf_life_months'],
        'ACTIVE SUBSTANCES': r['active_substances'],
        'STORAGE CONDITIONS': r['storage_conditions']
    }
    return {f: info_map[f] for f in fields if f in info_map}

@app.route('/api/strengths', methods=['POST'])
def api_strengths():
    try:
        data = request.json or {}
        med = data.get('medicine', '').strip()
        df = load_and_clean_data(load_config())
        corrected_name, strengths = get_strengths_for_medicine(df, med)
        return jsonify({
            'medicine_name': corrected_name or med,
            'strengths': strengths
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
@app.route('/api/alternatives', methods=['POST'])
def api_alternatives():
    try:
        data = request.json or {}
        med = str(data.get('medicine', '')).strip()
        s_val = str(data.get('strength_value', '')).strip()
        s_unit = str(data.get('strength_unit', '')).strip()
        alt_type = data.get('type', 'cheaper')

        med = normalize_medicine_name(med)

        df = load_and_clean_data(load_config())
        alts = get_alternatives(df, med, s_val, s_unit, alt_type)
        return jsonify({'alternatives': alts})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/compare', methods=['POST']) 
def api_compare(): 
    try: 
        data = request.json or {} 
        med1 = str(data.get('medicine1', '')).strip() 
        med2 = str(data.get('medicine2', '')).strip() 
        s1_val = str(data.get('strength1_value', '')).strip() 
        s1_unit = str(data.get('strength1_unit', '')).strip() 
        s2_val = str(data.get('strength2_value', '')).strip() 
        s2_unit = str(data.get('strength2_unit', '')).strip() 

        med1 = normalize_medicine_name(med1)
        med2 = normalize_medicine_name(med2)

        df = load_and_clean_data(load_config()) 
        table = compare_medicines(df, med1, med2, s1_val, s1_unit, s2_val, s2_unit) 
        return jsonify({'comparison': table}) 
    except Exception as e: 
        return jsonify({'error': str(e)}), 500

@app.route('/api/info', methods=['POST'])  
def api_info():  
    try:  
        data = request.json or {} 
        print("Received data:", data)   
         
        med = str(data.get('medicine', '')).strip()  
        fields = data.get('fields', [])  
        s_val = str(data.get('strength_value', '')).strip()  
        s_unit = str(data.get('strength_unit', '')).strip() 

        med = normalize_medicine_name(med)
 
        print(f"Medicine: {med}, Strength: {s_val} {s_unit}, Fields: {fields}") 
 
        df = load_and_clean_data(load_config())  
        print("Data loaded and cleaned:", df.head())  
 
        info = get_drug_info(df, med, s_val, s_unit, fields) 
        if not info: 
            return jsonify({'error': 'No information found for the drug'}), 404 
 
        return jsonify({'info': info})  
    except Exception as e:  
        print(f"Error: {str(e)}")  
        return jsonify({'error': str(e)}), 500 

@app.route('/')
def serve_index():
    return render_template('index.html')

def open_browser():
    webbrowser.open('http://127.0.0.1:5000/')

if __name__ == '__main__':
    threading.Thread(target=open_browser).start()
    app.run(debug=True)