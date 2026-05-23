from math import cos, sin, pi
from itertools import combinations
from random import randint

spin_center = (209, 185)
convert_int = {'common': 0, 'unusual': 1, 'rare': 2, 'epic': 3, 'legendary': 4, 'mythic': 5, 'ultra': 6, 'super': 7,
               'none': 8}
rarity_lists = ['common', 'unusual', 'rare', 'epic', 'legendary', 'mythic', 'ultra', 'super']

chance = [64, 32, 16, 8, 4, 2, 1]
ticks = [10, 10, 20, 110, 210, 254, 340]
cheat = 1
extend_r = [0, 10, 18, 25, 32, 38, 43, 48, 52, 56, 60, 63, 66, 68, 71, 73, 75, 76, 78, 79, 80, 82, 83, 83, 84, 85, 86,
            86, 87, 87, 88, 88, 88, 89, 89, 89, 89, 90, 90, 90, 90, 90, 91]  # index 0~42


def pos(r: float, d: float, cen_x: int = spin_center[0], cen_y: int = spin_center[1]):
    d = d * pi / 180
    x: int = 0
    y: int = 0
    if 0 <= d < 90:  # first quadrant
        x = int(r * cos(d) + cen_x)
        y = int(-r * sin(d) + cen_y)
    elif 90 <= d < 180:  # 2nd quadrant
        d = 180 - d
        x = int(-r * cos(d) + cen_x)
        y = int(-r * sin(d) + cen_y)
    elif 180 <= d < 270:  # 3rd quadrant
        d = d - 180
        x = int(-r * cos(d) + cen_x)
        y = int(r * sin(d) + cen_y)
    elif 270 <= d < 360:  # 4th quadrant
        d = 360 - d
        x = int(r * cos(d) + cen_x)
        y = int(r * sin(d) + cen_y)
    res = (x, y)
    return res


def get_value(idx=0):
    if idx == 0:
        return cheat


def toggle_cheat():
    global cheat
    if cheat == 1:
        cheat = 100
    else:
        cheat = 1


def toggle_luck():
    global chance
    if chance[0] == 64:
        better_chance = [96, 48, 24, 16, 8, 4, 3]
        for i in range(7):
            chance[i] = better_chance[i]
    else:
        normal_chance = [64, 32, 16, 8, 4, 2, 1]
        for i in range(7):
            chance[i] = normal_chance[i]


def single_result(ra):
    global cheat
    if cheat == 100:
        return True
    elif randint(1, 100) <= chance[ra]:
        return True
    else:
        return False


def result(ra: int, x: int = 5):
    success_petals = 0
    while x >= 5:
        if single_result(ra):
            success_petals += 1
            x -= 5
        else:
            x -= randint(1, 4)
    res = (success_petals, x)  # x: petals left
    return res


def fail_list(x: int = 2):
    x = 5 - x
    res = list(combinations([0, 1, 2, 3, 4], x))
    return res[randint(0, len(res) - 1)]


def num(x: int = 0):
    if x <= 1:
        return ''
    elif x < 1000:
        return 'x' + str(x)
    elif x < 1000000:
        return 'x' + str(x // 100 / 10) + 'k'
    else:
        return 'x' + str(x // 100000 / 10) + 'm'


def locate_r_idx(_r: int = 0):
    for i in range(42):
        if extend_r[i] <= _r <= extend_r[i+1]:
            return i


def spin_speed(x):
    return x if x < 24 else 24


def inventory_code(inventory_=(10, 10, 10, 10, 10, 10, 10, 10)):
    o = ':' + str(cheat)
    for i in range(8):
        o += ':' + str(inventory_[i])
    o += ':' + str(chance[0])
    return o


def auto_rarity(ra: str = ""):
    if ra == "common" or ra == "0":
        return 0
    elif ra == "unusual" or ra == "1":
        return 1
    elif ra == "rare" or ra == "2":
        return 2
    elif ra == "epic" or ra == "3":
        return 3
    elif ra == "legendary" or ra == "4":
        return 4
    elif ra == "mythic" or ra == "5":
        return 5
    elif ra == "ultra" or ra == "6":
        return 6
    return -1
