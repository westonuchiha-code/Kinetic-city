#!/usr/bin/env python3
"""Builds the 12 themed contact sheets in screenshots/tour_sheets/ from the raw tour screenshots.
Run after:  node test/tour.js && node test/probe.js && node test/windows.js   (needs Pillow)."""
import os
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
T = ROOT + '/screenshots/tour/'; OUT = ROOT + '/screenshots/tour_sheets/'
os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT): os.remove(OUT + f)
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 26)
except OSError: font = ImageFont.load_default()
SHEETS = [
 ('01_start_and_grabbing', [('01_title','Title'),('02_first_seconds','First seconds'),('03_walking','Behind a building: seen through a window'),('10_grab_prompt','Grab prompt'),('11_holding_crate','Holding a crate'),('13_holding_car','Holding a car')]),
 ('02_powers', [('14_car_thrown','Car thrown'),('17_barrel_explosion','Barrel explodes on impact'),('20_push','Push'),('21_gravity_well','Gravity well'),('23_absorbing','Absorb'),('24_absorb_blast','Absorb blast')]),
 ('03_enemies', [('30_gunmen','Gunmen'),('31_reflect','Push reflects bullets'),('32_brute_slam','Brute slam'),('33_brute_charge','Brute charge'),('34_elite','Elite'),('36_goon_held','Holding a goon')]),
 ('04_trouble_and_healing', [('37_police','Wanted by police'),('38_low_health','Low health'),('39_dead','Death'),('40_respawn','Respawn'),('45_wounded','Wounded civilians'),('46_healing','Healing')]),
 ('05_karma_and_events', [('48_draining','Draining'),('50_civilians_in_danger','Event: civilians in danger'),('51_supply_drop','Event: supply drop'),('52_hero_karma','Hero karma'),('53_villain_karma','Villain karma'),('54_street_life','Street life at the waterfront')]),
 ('06_hideout_assault', [('55_hideout_approach','Approach'),('57_tower_falls','Tower falls'),('58_gate_opens','Gate opens'),('59_wave','Wave 1'),('60_lieutenant','Lieutenant'),('61_hideout_cleared','Cleared')]),
 ('07_boss_cinder_krag', [('63_cinder_appears','Mr. Cinder appears'),('64_cinder_attack','Cinder attack'),('66_cinder_enraged_staggered','Enraged + staggered'),('67b_cinder_district_won','Ground Zero liberated'),('68_krag_appears','Krag appears'),('71_krag_enraged_staggered','Krag enraged')]),
 ('08_boss_krag_architect', [('72b_krag_district_won','The Slums dominated'),('73_architect_appears','The Architect appears'),('74_architect_attack','Architect attack'),('76_architect_enraged_staggered','Enraged + staggered'),('77_architect_down','Architect down'),('77b_architect_district_won','All districts cleared')]),
 ('09_places', [('80_parking_lot','Parking lot'),('81_basketball_court','Basketball court'),('82_construction_yard','Construction yard'),('84_shard','Park with a shard'),('86_barricade','Barricade'),('w_barricade_message','Barricade message')]),
 ('10_districts', [('88_slums_arrival','The Slums'),('89_slums_street','Slums street'),('90_breakers_hideout','Breakers hideout'),('91_tower_arrival','The Tower'),('92_tower_street','Tower street'),('94_liberated_ground_zero','Liberated Ground Zero')]),
 ('11_menus', [('95_level_up','Level up'),('96_pause_skills','Skills'),('98_costumes','Costumes'),('99_controls','Controls'),('99b_settings','Settings'),('99c_city_map','City map')]),
 ('12_pc_keyboard_and_windows', [('99d_keyboard_prompts','Keyboard + mouse prompts'),('99e_title_continue','Title with a save'),('w_ultrawide_title','Ultrawide 2560x1080'),('w_tall_5x4_pause','5:4 window, pause'),('w_laptop_1366_play','1366x768'),('w_small_window_play','Small window 960x540')]),
]
missing = []
for name, items in SHEETS:
    sheet = Image.new('RGB', (2400, 900), (10, 10, 14)); d = ImageDraw.Draw(sheet)
    for j, (f, cap) in enumerate(items):
        p = T + f + '.png'
        if not os.path.exists(p): missing.append(f); continue
        im = Image.open(p).convert('RGB'); iw, ih = im.size; k = min(800 / iw, 450 / ih); im = im.resize((int(iw * k), int(ih * k)), Image.LANCZOS)
        x, y = (j % 3) * 800, (j // 3) * 450; sheet.paste(im, (x + (800 - im.width) // 2, y + (450 - im.height) // 2))
        tw = d.textlength(cap, font=font); d.rectangle((x + 8, y + 450 - 44, x + 8 + tw + 16, y + 450 - 8), fill=(0, 0, 0)); d.text((x + 16, y + 450 - 42), cap, fill=(255, 220, 120), font=font)
    sheet.save(OUT + name + '.jpg', quality=90)
print('sheets written to screenshots/tour_sheets/' + ('; MISSING shots: ' + ', '.join(missing) if missing else ''))
