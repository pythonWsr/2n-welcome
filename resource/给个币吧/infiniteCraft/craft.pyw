from calculation import *
from PIL.Image import open
from PIL.ImageTk import PhotoImage
import tkinter as tk
from tkinter import ttk

window = tk.Tk()
window.resizable(False, False)
window.title("Infinite Craft 2.2")
window.iconbitmap("icon32.ico")
c = tk.Canvas(window, width=617, height=433)
frameVar = tk.PhotoImage(file=r"frame.gif")
frame = c.create_image(0, 0, anchor=tk.NW, image=frameVar)
shadow = "#B18049"
white = "#EBFCFE"
state = "none"
shift = True
auto: int = -1

petal_name = 'bubble'
lower_limit = 0
bg_root = tk.PhotoImage(file="empty.gif")
roots = [open(r"petals/bubble/common.png"), open(r"petals/bubble/unusual.png"), open(r"petals/bubble/rare.png"),
         open(r"petals/bubble/epic.png"), open(r"petals/bubble/legendary.png"), open(r"petals/bubble/mythic.png"),
         open(r"petals/bubble/ultra.png"), open(r"petals/bubble/super.png")]
roots_photoImg = []
for i in range(8):
    roots_photoImg.append(PhotoImage(roots[i]))

# inventory
inventory = [10, 10, 10, 10, 10, 10, 10, 10, -1]
inventory_pics = []
inventory_text = []
shades = []
for i in range(8):
    inventory_pics.append(c.create_image(55+i*70, 396, image=roots_photoImg[i]))
    shades.append(c.create_rectangle(25+70*i, 366, 85+70*i, 426, fill=shadow, width=0, state=tk.HIDDEN))
for i in range(8):
    inventory_text.append(c.create_text(80+i*70, 370, text='', fill=white, font=('ubuntu', 13), angle=-20))
inventory_resized_image = roots[5]
inventory_resized_photo = PhotoImage(inventory_resized_image)
inventory_id = -1

# ROTATE
r: int = 91
d = [18, 90, 162, 234, 306]
stop_t = 0
coords = [pos(r, d[0]), pos(r, d[1]), pos(r, d[2]), pos(r, d[3]), pos(r, d[4])]
inserted_sum = 0
inserted_rarity = 8
photoImg = tk.PhotoImage(file="empty.gif")
insert_animation = 0
chance_text_b = c.create_text(384, 205, anchor='e', text='?', font=('ubuntu', 11), fill='black')
chance_text_w = c.create_text(383, 205, anchor='e', text='?', font=('ubuntu', 10), fill='#EBFCFE')

# SUCCESS
craft_result = ()
new = roots[7]
new_d = 0
new_petal_d = -30
crafted_image_var = PhotoImage(new)
crafted_pic = c.create_image(209, 185, image=crafted_image_var, state=tk.HIDDEN)
success_text = c.create_text(239, 155, fill=white, font=('ubuntu', 15), text='', angle=-30)
breaks = [0, 1, 2, 3, 4]

# 5 SPINNING SLOTS
targets = []
rotate_pics = []
rotate_texts = []
for i in range(5):
    targets.append(c.create_rectangle(coords[i][0]-30, coords[i][1]-30, coords[i][0]+30, coords[i][1]+30, fill=shadow,
                   state=tk.HIDDEN, width=0))
    rotate_pics.append(c.create_image(coords[i][0], coords[i][1], anchor='center', image=photoImg))
    rotate_texts.append(c.create_text(coords[i][0]+30, coords[i][1]-30, fill=white, font=("ubuntu", 15), angle=-30))

# BUTTON
buttonImg = [tk.PhotoImage(file=r'buttonImg/common.png'), tk.PhotoImage(file=r'buttonImg/unusual.png'),
             tk.PhotoImage(file=r'buttonImg/rare.png'), tk.PhotoImage(file=r'buttonImg/epic.png'),
             tk.PhotoImage(file=r'buttonImg/legendary.png'), tk.PhotoImage(file=r'buttonImg/mythic.png'),
             tk.PhotoImage(file=r'buttonImg/ultra.png'), tk.PhotoImage(file=r'buttonImg/none.png'),]
craft_button = c.create_image(406, 164, anchor='nw', image=buttonImg[7])
sign_x = tk.PhotoImage(file="calculating.gif")
sign = c.create_image(324, 218, anchor="nw", image=sign_x, state=tk.HIDDEN)

shift_square = c.create_rectangle(489, 13, 514, 38, fill='#DDDDDD', width=3)
c.create_text(548, 25, text='Shift', font=('ubuntu', 17), fill=white)

frame = tk.Frame(window)
f_combo = ttk.Combobox(frame, state='readonly', width=10, values=('Common', 'Unusual', 'Rare', 'Epic', 'Legendary',
                                                                  'Mythic', 'Ultra', 'Super'))
f_entry = tk.Entry(frame, width=10, font=('ubuntu', 13))
f_button = tk.Button(frame, text='Update', font=('ubuntu', 13))
f_text2 = tk.Label(frame, text='Petal:Bubble', font=('ubuntu', 16))
f_entry2 = tk.Entry(frame, font=('ubuntu', 13))
f_button2 = tk.Button(frame, text='Update', font=('ubuntu', 13))
f_entry3 = tk.Entry(frame, font=('ubuntu', 13))
f_button3 = tk.Button(frame, text='Update', font=('ubuntu', 13))
f_text4 = tk.Label(frame, text='Broken Petals: 0', font=('ubuntu', 13))
broken_cnt = 0


def update_roots(new_name: str = 'basic'):
    global roots, roots_photoImg, inventory, lower_limit, petal_name
    f_text2.config(text='Petal:'+new_name.capitalize())
    if state != 'none' or petal_name == new_name:
        return
    lower_limit = 0
    petal_name = new_name
    for i in range(8):
        try:
            roots[i] = open('petals/'+petal_name+'/'+rarity_lists[i]+'.png')
            roots_photoImg[i] = PhotoImage(roots[i])
            inventory[i] = 10
            c.itemconfig(inventory_pics[i], image=roots_photoImg[i])
            c.itemconfig(shades[i], state=tk.HIDDEN)
        except FileNotFoundError:
            c.itemconfig(shades[i], state=tk.NORMAL)
            inventory[i] = 0
            lower_limit = i+1
    update_text()


def update_targets():
    for i in range(5):
        c.coords(targets[i], coords[i][0]-30, coords[i][1]-30, coords[i][0]+30, coords[i][1]+30)


def flash(updates=(0, 1, 2, 3, 4)):
    for i in updates:
        coords[i] = pos(r, d[i])
        c.coords(rotate_texts[i], coords[i][0]+30, coords[i][1]-30)
        c.coords(rotate_pics[i], coords[i][0], coords[i][1])


def update_text():
    for i in range(8):
        c.itemconfig(inventory_text[i], text=num(inventory[i]))
    x = inserted_sum // 5
    y = inserted_sum % 5
    for i in range(5):
        if i < y:
            c.itemconfig(rotate_texts[i], text=num(x+1))
        else:
            c.itemconfig(rotate_texts[i], text=num(x))


def get_code():
    return 'ic2.2:' + petal_name + inventory_code(inventory)


def read_code(o: str):
    code_list = o.split(':')
    if code_list[0] != 'ic2.2' or len(code_list) != 12:
        return
    if code_list[2] != str(get_value()):
        toggle_cheat()
    if code_list[11] != str(chance[0]):
        toggle_luck()
    update_roots(code_list[1])
    for i in range(3, 11):
        inventory[i-3] = int(code_list[i])
        c.itemconfig(shades[i-3], state=(tk.NORMAL if inventory[i-3] == 0 else tk.HIDDEN))
    update_text()


def insert_to_rotate_slot(ra=inserted_rarity, dis: float = 61, animation_id=insert_animation, updates=(0, 1, 2, 3, 4)):
    global r, d, state
    if animation_id != insert_animation:
        return
    if dis == 61:
        global photoImg, state
        state = 'animation'
        for i in range(5):
            c.itemconfig(rotate_pics[i], image=roots_photoImg[ra])
        for i in updates:
            c.itemconfig(targets[i], state=tk.NORMAL)
        insert_to_rotate_slot(ra, 60, animation_id, updates)
        return
    elif dis < 0.3:
        state = 'inserted'
        for i in updates:
            c.itemconfig(targets[i], state=tk.HIDDEN)
        if auto != -1:
            window.after(500, craft)
        return
    dis *= 0.8
    r = int(91-dis)
    flash(updates)
    window.after(15, insert_to_rotate_slot, ra, dis, animation_id, updates)


def craft_success(ra, t=30, pic_width=65):
    global r, d, c, craft_result, new_petal_d
    if r > 45:
        r -= 3
        for i in range(5):
            d[i] = (d[i] - 20) % 360
        flash()
        window.after(9, craft_success, ra, 30, pic_width)
        return
    if t == 30:
        global inserted_sum, broken_cnt, inventory_id, inserted_rarity
        inserted_rarity = 8
        broken_cnt = inserted_sum = 0
        new_petal_d = -55
        inventory[ra] += craft_result[0]
        for i in range(5):
            c.itemconfig(rotate_pics[i], state=tk.HIDDEN)
        update_targets()
        c.itemconfig(success_text, text=num(craft_result[0]))
        c.itemconfig(crafted_pic, state=tk.NORMAL)
        c.itemconfig(shades[ra], state=tk.HIDDEN)
        c.itemconfig(craft_button, image=buttonImg[7])
        if craft_result[1] > 0:
            inventory[ra-1] += craft_result[1]
            c.itemconfig(shades[ra-1], state=tk.HIDDEN)
        update_text()
        if inventory[ra] == craft_result[0]:
            inventory_id = (inventory_id+1) % 1000
            inventory_zoom2(aid=inventory_id, ra=ra)
        t = 35
    else:
        global new, crafted_image_var
        if 36 <= t <= 40:
            pic_width += 6
            new_petal_d += 7
        elif 41 <= t <= 45:
            pic_width -= 3
            new_petal_d += 3
        elif 46 <= t <= 50:
            pic_width -= 2
            new_petal_d += 1
        else:
            global state
            state = 'crafted'
            if inventory[ra-1] >= 5 and auto != -1:
                window.after(1500, insert_petal, ra-1)
            return
        new = roots[ra].resize((pic_width, pic_width))
        new = new.rotate(new_petal_d)
        crafted_image_var = PhotoImage(new)
        c.itemconfig(crafted_pic, image=crafted_image_var)
    window.after(9, craft_success, ra, t+1, pic_width)


def craft_fail(idx=-1, x=3, t=20):
    global inserted_rarity, r
    if idx == -1:
        idx = locate_r_idx(r)
        global inserted_sum, broken_cnt, f_text4, breaks
        broken_cnt += inserted_sum-x
        inserted_sum = 0
        breaks = fail_list(x)
        f_text4.config(text='Broken Petals: '+str(broken_cnt))
        inventory[inserted_rarity] += x
        c.itemconfig(craft_button, image=buttonImg[7])
        for i in range(5):
            c.itemconfig(rotate_texts[i], text='')
        for i in breaks:
            c.itemconfig(rotate_pics[i], image=bg_root)
    elif idx >= 42:
        update_targets()
        global state, auto
        state = 'failed'
        if inventory[inserted_rarity] >= 5 and auto != -1:
            window.after(500, insert_petal, inserted_rarity)
        return
    else:
        idx += 1
        for i in range(5):
            d[i] = (d[i] - max(spin_speed(91 - extend_r[idx]), t)) % 360
    flash()
    update_targets()
    r = extend_r[idx]
    window.after(15, craft_fail, idx, x, t-1)


def spin(t: int = 0):
    if t == 0:
        c.itemconfig(sign, state=tk.HIDDEN)
    global r
    tick = t % 42
    if t == stop_t:
        global craft_result
        if craft_result[0] > 0:
            craft_success(inserted_rarity+1)
        else:
            craft_fail(-1, craft_result[1])
        return
    global d
    if tick < 13:
        r -= 4
    elif tick < 21:
        r -= 1
    elif tick < 34:
        r += 4
    else:
        r += 1
    for i in range(5):
        d[i] = (d[i]-spin_speed(t//2)) % 360
    flash()
    window.after(9, spin, t+1)


def extend(t=0):
    global r, coords, state, inserted_sum
    if t == 15:
        if inserted_sum == 0:
            state = "none"
        else:
            state = "inserted"
            if auto != -1:
                window.after(500, craft)
        update_targets()
        return
    elif t == 0:
        c.itemconfig(crafted_pic, state=tk.HIDDEN)
        c.itemconfig(success_text, text='')
        state = 'animation'
        r = 0
        if inserted_sum == 0:
            for i in range(5):
                c.itemconfig(rotate_pics[i], image=bg_root, state=tk.NORMAL)
        else:
            global inserted_rarity
            for i in range(5):
                c.itemconfig(rotate_pics[i], image=roots_photoImg[inserted_rarity], state=tk.NORMAL)
    else:
        r = extend_r[(t*3)]
    flash()
    window.after(15, extend, t+1)


def craft():
    global r, state, craft_result, stop_t
    state = 'animation'
    c.itemconfig(craft_button, image=buttonImg[7])
    r = 91
    craft_result = result(inserted_rarity, inserted_sum)
    stop_t = ticks[inserted_rarity]
    if craft_result[0] == 0 and inserted_sum - craft_result[1] < 5:
        stop_t = stop_t * (5-craft_result[1]) // 5
    if craft_result[0] == 0:
        stop_t += randint(5, 24)
    spin(0)


def inventory_zoom(t=0, aid=inventory_id, ra=inserted_rarity, width=52):
    if aid != inventory_id:
        if ra != inserted_rarity:
            c.itemconfig(inventory_pics[ra], image=roots_photoImg[ra])
        return
    elif t == 8:
        c.itemconfig(inventory_pics[ra], image=roots_photoImg[ra])
        return
    global inventory_resized_image, inventory_resized_photo
    width += 1
    inventory_resized_image = roots[ra].resize((width, width))
    inventory_resized_photo = PhotoImage(inventory_resized_image)
    c.itemconfig(inventory_pics[ra], image=inventory_resized_photo)
    window.after(15, inventory_zoom, t+1, aid, ra, width)


def inventory_zoom2(t=0, aid=inventory_id, ra=inserted_rarity, width=75, angle=15):
    if aid != inventory_id:
        if ra != inserted_rarity:
            c.itemconfig(inventory_pics[ra], image=roots_photoImg[ra])
        return
    elif t == 5:
        c.itemconfig(inventory_pics[ra], image=roots_photoImg[ra])
        return
    global inventory_resized_image, inventory_resized_photo
    width -= 3
    angle -= 3
    inventory_resized_image = roots[ra].resize((width, width))
    inventory_resized_image = inventory_resized_image.rotate(angle)
    inventory_resized_photo = PhotoImage(inventory_resized_image)
    c.itemconfig(inventory_pics[ra], image=inventory_resized_photo)
    window.after(20, inventory_zoom2, t+1, aid, ra, width, angle)


def insert_petal(ra=5):
    global inserted_sum, inventory, inserted_rarity, insert_animation, state, breaks
    if state == 'animation':
        return
    if inserted_rarity == ra:
        if state == 'failed':
            state = 'inserted'
            insert_to_rotate_slot(ra, 61, insert_animation, breaks)
        if shift:
            inserted_sum += inventory[ra]
            inventory[ra] = 0
        else:
            if inventory[ra] <= 5:
                inserted_sum += inventory[ra]
                inventory[ra] = 0
            else:
                inserted_sum += 5
                inventory[ra] -= 5
    else:
        c.itemconfig(chance_text_b, text=str(chance[ra]))
        c.itemconfig(chance_text_w, text=str(chance[ra]))
        inventory[inserted_rarity] += inserted_sum
        global broken_cnt
        broken_cnt = 0
        f_text4.config(text='Broken Petals: 0')
        if inventory[inserted_rarity] > 0:
            c.itemconfig(shades[inserted_rarity], state='hidden')
        inserted_rarity = ra
        if shift:
            inserted_sum = inventory[ra]
            inventory[ra] = 0
        else:
            inserted_sum = 5
            inventory[inserted_rarity] -= 5
        if state == 'crafted':
            extend()
        else:
            insert_animation = (insert_animation+1) % 114514
            insert_to_rotate_slot(ra, 61, insert_animation, (0, 1, 2, 3, 4))
    c.itemconfig(craft_button, image=buttonImg[ra])
    if inventory[ra] == 0:
        c.itemconfig(shades[ra], state=tk.NORMAL)
    else:
        global inventory_id
        inventory_id = (inventory_id+1) % 1000
        inventory_zoom(0, inventory_id, ra, 50)
    update_text()


def toggle_shift():
    global shift
    if auto != -1:
        return
    if shift:
        shift = False
        c.itemconfig(shift_square, fill='#666666')
    else:
        shift = True
        c.itemconfig(shift_square, fill='#DDDDDD')


def in_rotate(event):
    global coords
    for i in range(5):
        if coords[i][0]-30 <= event.x <= coords[i][0]+30 and coords[i][1]-30 <= event.y <= coords[i][1]+30:
            return True
    return False


def in_coords(a1, a3, a2, a4, event):
    return a1 <= event.x <= a2 and a3 <= event.y <= a4


def click(event):
    global state, breaks, inserted_sum
    if in_coords(406, 164, 470, 192, event) and state == 'inserted':
        if inserted_sum >= 4500000:
            c.itemconfig(sign, state=tk.NORMAL)
        window.after(1, craft)
    elif in_coords(25, 366, 85, 426, event):
        if inventory[0]+inserted_sum >= 5 and lower_limit <= 0:
            insert_petal(0)
    elif in_coords(95, 366, 155, 426, event):
        if inventory[1]+inserted_sum >= 5 and lower_limit <= 1:
            insert_petal(1)
    elif in_coords(165, 366, 225, 426, event):
        if inventory[2]+inserted_sum >= 5 and lower_limit <= 2:
            insert_petal(2)
    elif in_coords(235, 366, 295, 426, event):
        if inventory[3]+inserted_sum >= 5 and lower_limit <= 3:
            insert_petal(3)
    elif in_coords(305, 366, 365, 426, event):
        if inventory[4]+inserted_sum >= 5 and lower_limit <= 4:
            insert_petal(4)
    elif in_coords(375, 366, 435, 426, event):
        if inventory[5]+inserted_sum >= 5 >= lower_limit:
            insert_petal(5)
    elif in_coords(445, 366, 505, 426, event):
        if inventory[6]+inserted_sum >= 5 and lower_limit <= 6:
            insert_petal(6)
    elif in_coords(489, 13, 514, 38, event):
        toggle_shift()
    elif in_rotate(event) and (state == 'inserted' or state == 'failed'):
        global inventory_id, inserted_rarity
        breaks = [0, 1, 2, 3, 4]
        c.itemconfig(chance_text_b, text='?')
        c.itemconfig(chance_text_w, text='?')
        c.itemconfig(craft_button, image=buttonImg[7])
        inventory[inserted_rarity] += inserted_sum
        if inventory[inserted_rarity] > 0:
            c.itemconfig(shades[inserted_rarity], state=tk.HIDDEN)
        for i in range(5):
            c.itemconfig(rotate_pics[i], image=bg_root)
        inventory_id = (inventory_id+1) % 1000
        inventory_zoom(0, inventory_id, inserted_rarity, 50)
        inserted_sum = 0
        state = 'none'
        inserted_rarity = 8
        update_text()
    elif in_rotate(event) and state == 'crafted':
        breaks = [0, 1, 2, 3, 4]
        c.itemconfig(chance_text_w, text='?')
        c.itemconfig(chance_text_b, text='?')
        extend()


def button1press():
    try:
        ra = convert_int[f_combo.get().lower()]
        num = int(f_entry.get())
        global lower_limit
        if num >= 0 and ra >= lower_limit:
            inventory[ra] = num
        if inventory[ra] == 0:
            c.itemconfig(shades[ra], state=tk.NORMAL)
        else:
            c.itemconfig(shades[ra], state=tk.HIDDEN)
        update_text()
    except ValueError:
        pass
    except KeyError:
        pass


def button2press():
    new_name = f_entry2.get().lower()
    if new_name == '' or auto != -1 or state != "none":
        return
    else:
        update_roots(new_name)
    f_entry2.delete('0', tk.END)


def auto_start():
    window.unbind("<ButtonRelease-1>")
    if state == "inserted" and inserted_rarity == auto:
        craft()
    elif inventory[auto] >= 5:
        insert_petal(auto)


def button3press():
    command = f_entry3.get().lower()
    if command == 'cheat':
        toggle_cheat()
        f_entry3.delete('0', tk.END)
    elif command == 'update_text':
        update_text()
    elif command == 'code':
        f_entry3.delete('0', tk.END)
        f_entry3.insert('0', get_code())
    elif command == 'clear super' or command == 'cs':
        inventory[7] = 0
        update_text()
        c.itemconfig(shades[7], state=tk.NORMAL)
        f_entry3.delete('0', tk.END)
    elif command == "rng":
        toggle_luck()
        f_entry3.delete('0', tk.END)
    elif "auto" in command:
        f_entry3.delete('0', tk.END)
        try:
            global auto, shift
            flag = False
            if auto == -1:
                flag = True
            auto = auto_rarity(command.split(" ")[1])
            if auto == -1:
                window.bind("<ButtonRelease-1>", click)
            if flag:
                shift = False
                auto_start()
        except IndexError:
            pass
    else:
        try:
            read_code(f_entry3.get())
            f_entry3.delete('0', tk.END)
        except TypeError:
            update_roots('bubble')


def launch(event):
    tk.Label(frame, text='Inventory', font=('ubuntu', 16)).grid(row=0, column=0, columnspan=4, sticky=tk.E+tk.W)
    f_combo.grid(row=1, column=0, sticky=tk.N)
    f_entry.grid(row=1, column=2, sticky=tk.N)
    f_button.grid(row=1, column=3, sticky=tk.N)
    f_text2.grid(row=2, column=0, sticky=tk.W+tk.E, columnspan=4)
    f_entry2.grid(row=3, column=0, columnspan=4, sticky=tk.W)
    f_button2.grid(row=3, column=0, columnspan=4, sticky=tk.E)
    tk.Label(frame, text='Command', font=('ubuntu', 16)).grid(row=4, column=0, columnspan=4, sticky=tk.E+tk.W)
    f_entry3.grid(row=5, column=0, columnspan=4, sticky=tk.W)
    f_button3.grid(row=5, column=0, columnspan=4, sticky=tk.E)
    tk.Label(frame, text='Counter', font=('ubuntu', 16)).grid(row=6, column=0, columnspan=4, sticky=tk.E+tk.W)
    f_text4.grid(row=7, column=0, columnspan=4, sticky=tk.E+tk.W)
    update_text()
    window.bind("<ButtonRelease-1>", click)


f_button['command'] = button1press
f_button2['command'] = button2press
f_button3['command'] = button3press
c.grid(row=0, column=0)
frame.grid(row=0, column=1, sticky=tk.N)
launch(None)
# window.bind("<ButtonRelease-1>", launch)
window.mainloop()
