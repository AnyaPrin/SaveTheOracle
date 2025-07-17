# Minfilia version.1.1
# SAVE THE ORACLE.
#
import pygame
import os
import random # Added to randomly select blocks for destruction

# Safely loads a file (sound or image) and handles missing files or loading errors.
def safe_load(path, loader_func, success_msg_prefix="File", error_msg_prefix="Error loading"):
    """
    Safely loads a resource (image or sound) from the given path.
    Prints warnings if the file is not found or an error occurs during loading.
    """
    if not os.path.exists(path):
        print(f"Warning: {success_msg_prefix} file not found at '{path}'. Skipping.")
        return None
    try:
        loaded_item = loader_func(path)
        print(f"Loaded {success_msg_prefix} from '{path}'")
        return loaded_item
    except pygame.error as e:
        print(f"{error_msg_prefix} '{path}': {e}. Skipping.")
        return None

## Configuration

# Directory paths
FONT_DIR = 'fonts'
IMG_DIR = 'images'
SND_DIR = 'sounds'

# Game Board Dimensions and Sizing
CELL = 100  # Size of each cell in pixels
W, H = 4, 5  # Board dimensions (width, height in cells)
GOAL_X, GOAL_Y = 1, 3  # preclr Goal position for The Oracle (block ID 1)
CLR_GOAL_X, CLR_GOAL_Y = 1, 5 # clear Goal position for The Oracle (block ID 1)


# Display and Frame Settings
BLK_BRDR = 1  # Block border thickness
WALL = CELL  # Frame thickness (castle wall)

SCRN_W = W * CELL + WALL * 2 + BLK_BRDR
SCRN_H = H * CELL + WALL * 2 + BLK_BRDR

# Colors
GOAL_COL = (0, 255, 0)
BLK_COL = (21, 100, 200)
SBLK_COL = (200, 200, 25)  # Selected block color
WALL_COL = (200, 200, 200) # Castle wall color
FLR_COL = (10, 10, 10)     # Floor color
ORACLE_COL = (200, 200, 180) # Oracle block default color (if no image)
TXT_DARK = (0, 40, 40)
TXT_LIGHT = (255, 255, 255)
CLR_TXT_COL = TXT_LIGHT

# Oracle Image Files (directional) - Used for animation
ORACLE_IMG_U = "ryneU.png"
ORACLE_IMG_D = "ryneD.png"
ORACLE_IMG_L = "ryneL.png"
ORACLE_IMG_R = "ryneR.png"

WALL_IMG = "wall3.png" # Castle wall image

# Miracle Button Settings
BTN_W, BTN_H = CELL * 1.0, CELL * 1.0
BTN_PAD = 20  # Padding from screen edge
BTN_X = BTN_PAD
BTN_Y = SCRN_H - BTN_PAD - BTN_H
BTN_COL = (250, 250, 150)  # Button background color
BTN_TXT_COL = (2, 2, 12)
BTN_TXT_SIZE = 16
BTN_IMG_FILE = "miracle.png" # Static image for the button
RETRY_BTN_IMG_FILE = "retry.png" # Image for the retry button

# 既存の設定の下に追加
RETRY_BTN_W, RETRY_BTN_H = BTN_W, BTN_H
RETRY_BTN_X = SCRN_W - BTN_PAD - BTN_W
RETRY_BTN_Y = BTN_Y
RETRY_BTN_COL = (10, 12, 120)
RETRY_BTN_TXT_COL = (210, 210, 240)
RETRY_BTN_TXT_SIZE = 20


# Image filename patterns for other blocks
IMG_PAT = "block{bid}.png"

# Font settings
MSG_FONT_FILE = "Meiryo.ttc" # Changed to a common Japanese font
MSG_FONT_SIZE = CELL // 5

# Sound Settings
SELECT_SND_FILE = 'select.wav'
MOVE_SND_FILE = 'move.wav'
MIRACLE_SND_FILE = 'miracle.wav' # Sound for Miracle Flash activation
CLR_SND_FILE = 'clear.wav' # Main clear sound (e.g., for full game clear)

VOL_SELECT = 1.0 # Volume for block selection/bust
VOL_MOVE = 1.0   # Volume for block movement
VOL_CLR = 0.5    # Volume for overall clear animation
VOL_FLASH = 0.5  # Volume for Miracle Flash sound

# Miracle Flash Animation Settings
MIRACLE_FLASH_ROTATION_DURATION = 500 # Oracle's rotation time (milliseconds)
MIRACLE_FLASH_BUST_DELAY = 200      # Delay between block destruction (milliseconds)

# Flash Effect Settings (when a block is busted)
FLASH_EFFECT_DURATION = 20          # Duration of the flash effect (milliseconds)
FLASH_COLOR = (255, 255, 200)       # Color of the flash (slightly yellowish white)


###
## Initial Game State

INIT_BOARD = [
    [2, 1, 1, 3],
    [2, 1, 1, 3],
    [4, 6, 6, 5],
    [4, 9, 10, 5],
    [7, 0, 0, 8]
]
INIT_BLKS = {
    1: {'size': (2, 2), 'pos': (1, 0)}, # Main block (Oracle)
    2: {'size': (1, 2), 'pos': (0, 0)},
    3: {'size': (1, 2), 'pos': (3, 0)},
    4: {'size': (1, 2), 'pos': (0, 2)},
    5: {'size': (1, 2), 'pos': (3, 2)},
    6: {'size': (2, 1), 'pos': (1, 2)},
    7: {'size': (1, 1), 'pos': (0, 4)},
    8: {'size': (1, 1), 'pos': (3, 4)},
    9: {'size': (1, 1), 'pos': (1, 3)},
    10: {'size': (1, 1), 'pos': (2, 3)},
}

### Pygame Initialization
SCRN = pygame.display.set_mode((SCRN_W, SCRN_H))
pygame.display.set_caption("Save The Oracle")

### Game Variables (Global)

# Game board and block data
board = [row[:] for row in INIT_BOARD] # Deep copy of the initial board state
blks = {k: v.copy() for k, v in INIT_BLKS.items()} # Deep copy of initial block properties

# Game state flags and variables
selected = board[0][0] if board[0][0] else 1 # ID of the currently selected block
pre_clr = False          # True if Oracle is at the Goal position
clr_ani_act = False      # True if the Oracle's clear animation is running
clr_ani_start_time = 0   # Time when the clear animation started
clr_ani_duration = 500   # Duration of the clear animation in milliseconds
clr = False              # Final game cleared state flag (after animation)

is_dragging = False      # True if a block is currently being dragged
drag_start_mouse_pos = (0, 0) # Mouse position (pixels) when drag started
drag_start_blk_pos = (0, 0)   # Block position (cells) when drag started

# Image and Sound Assets
imgs = {}           # Stores loaded images: {block_id: [surface1, surface2, ...]}
ani_idx = {bid: 0 for bid in blks} # Current image index for each block (0 for static, specific index for Oracle)
btn_img = None      # Miracle button image
retry_btn_img = None # Retry button image
wall_img = None     # Castle wall image

# Sound objects (initialized in load_all_resources)
snd_select = None
snd_move = None
snd_miracle = None
snd_clr = None

miracle_btn_used = False  # True if the Miracle button has been used


# Oracle image index mapping for directional movement (filled in load_all_resources)
ORACLE_IMG_IDX = {}

# Miracle Flash animation state variables
miracle_flash_ani_active = False    # True if Miracle Flash animation is active
miracle_flash_phase = 0             # 0: idle, 1: Oracle rotation, 2: block destruction
miracle_flash_phase_start_time = 0  # Start time for current animation phase
miracle_flash_blocks_to_bust = []   # List of block IDs to be destroyed during Miracle Flash

# Flash effect variables (triggered when blocks are busted)
flash_effect_active = False         # True if flash effect is active
flash_effect_start_time = 0         # Time when flash effect started

# Font object (initialized in load_all_resources)
msg_font = None

# クリア時のsnd_miracle再生済みフラグ
clr_miracle_played = False  # クリア時のsnd_miracle再生済みフラグ

###
## Resource Loading

def load_all_resources():
    """Loads all necessary game resources: fonts, images, and sounds."""
    global wall_img, msg_font, btn_img, retry_btn_img, snd_select, snd_move, snd_clr, snd_miracle, ORACLE_IMG_IDX

    # Load Message Font
    font_path = os.path.join(FONT_DIR, MSG_FONT_FILE)
    msg_font = safe_load(font_path, lambda p: pygame.font.Font(p, MSG_FONT_SIZE), "Message Font")
    
    # Load UI Images
    btn_img = safe_load(os.path.join(IMG_DIR, BTN_IMG_FILE), pygame.image.load, "Miracle Button Image")
    retry_btn_img = safe_load(os.path.join(IMG_DIR, RETRY_BTN_IMG_FILE), pygame.image.load, "Retry Button Image")
    wall_img = safe_load(os.path.join(IMG_DIR, WALL_IMG), pygame.image.load, "Castle wall Image")
    
    # Load Sounds
    SOUND_CONFIGS = [
        ('snd_select', SELECT_SND_FILE, VOL_SELECT),
        ('snd_move', MOVE_SND_FILE, VOL_MOVE),
        ('snd_miracle', MIRACLE_SND_FILE, VOL_FLASH),
        ('snd_clr', CLR_SND_FILE, VOL_CLR),
    ]
    for var_name, file_name, volume in SOUND_CONFIGS:
        full_path = os.path.join(SND_DIR, file_name)
        snd_obj = safe_load(full_path, pygame.mixer.Sound, "Sound")
        if snd_obj:
            snd_obj.set_volume(volume)
        globals()[var_name] = snd_obj # Assign loaded sound to global variable

    # Load Block Images
    for bid in blks:
        blk_imgs = []
        if bid == 1: # Oracle block (ID 1) - loads directional images for animation
            oracle_img_files = [ORACLE_IMG_U, ORACLE_IMG_D, ORACLE_IMG_L, ORACLE_IMG_R]
            for idx, f_name in enumerate(oracle_img_files):
                fn = os.path.join(IMG_DIR, f_name)
                blk_img = safe_load(fn, pygame.image.load, f"Oracle image: {f_name}")
                if blk_img:
                    blk_imgs.append(blk_img)
                    # Map direction strings to loaded image indices for easy lookup
                    if f_name == ORACLE_IMG_U: ORACLE_IMG_IDX['up'] = idx
                    elif f_name == ORACLE_IMG_D: ORACLE_IMG_IDX['down'] = idx
                    elif f_name == ORACLE_IMG_L: ORACLE_IMG_IDX['left'] = idx
                    elif f_name == ORACLE_IMG_R: ORACLE_IMG_IDX['right'] = idx

            if not blk_imgs:
                print(f"Warning: No oracle images loaded for blk {bid}. Using placeholder.")
                blk_imgs.append(None) # Fallback to None if no images loaded
                ani_idx[bid] = 0 # Ensure a valid index even if no images
        else: # Other blocks are static (single image)
            fn = os.path.join(IMG_DIR, IMG_PAT.format(bid=bid))
            img_static = safe_load(fn, pygame.image.load, f"Image for blk {bid}")
            if img_static:
                blk_imgs.append(img_static)
            if not blk_imgs:
                print(f"Warning: No image loaded for blk {bid}. Using placeholder.")
                blk_imgs.append(None)
        imgs[bid] = blk_imgs # Store the list of block images for the block
### Resource Loading

def load_fonts():
    global msg_font
    font_path = os.path.join(FONT_DIR, MSG_FONT_FILE)
    msg_font = safe_load(font_path, lambda p: pygame.font.Font(p, MSG_FONT_SIZE), "Message Font")

def load_images():
    global btn_img, retry_btn_img, wall_img, imgs, ORACLE_IMG_IDX
    btn_img = safe_load(os.path.join(IMG_DIR, BTN_IMG_FILE), pygame.image.load, "Miracle Button Image")
    retry_btn_img = safe_load(os.path.join(IMG_DIR, RETRY_BTN_IMG_FILE), pygame.image.load, "Retry Button Image")
    wall_img = safe_load(os.path.join(IMG_DIR, WALL_IMG), pygame.image.load, "Castle wall Image")
    imgs.clear()  # Clear existing images to reload
    ORACLE_IMG_IDX.clear()  # Clear existing Oracle image indices
    for bid in blks:
        blk_imgs = []
        if bid == 1: # Oracle block (ID 1) - loads directional images for animation
            oracle_img_files = [ORACLE_IMG_U, ORACLE_IMG_D, ORACLE_IMG_L, ORACLE_IMG_R]
            for idx, f_name in enumerate(oracle_img_files):
                fn = os.path.join(IMG_DIR, f_name)
                blk_img = safe_load(fn, pygame.image.load, f"Oracle image: {f_name}")
                if blk_img:
                    blk_imgs.append(blk_img)
                    if f_name == ORACLE_IMG_U: ORACLE_IMG_IDX['up'] = idx
                    elif f_name == ORACLE_IMG_D: ORACLE_IMG_IDX['down'] = idx
                    elif f_name == ORACLE_IMG_L: ORACLE_IMG_IDX['left'] = idx
                    elif f_name == ORACLE_IMG_R: ORACLE_IMG_IDX['right'] = idx
            if not blk_imgs:
                print(f"Warning: No oracle images loaded for blk {bid}. Using placeholder.")
                blk_imgs.append(None) # Fallback to None if no images loaded
                ani_idx[bid] = 0 # Ensure a valid index even if no images
        else: # Other blocks are static (single image)
            fn = os.path.join(IMG_DIR, IMG_PAT.format(bid=bid))
            img_static = safe_load(fn, pygame.image.load, f"Image for blk {bid}")
            if img_static:
                blk_imgs.append(img_static)
            if not blk_imgs:
                print(f"Warning: No image loaded for blk {bid}. Using placeholder.")
                blk_imgs.append(None)
        imgs[bid] = blk_imgs # Store the list of block images for the block

def load_sounds():
    global snd_select, snd_move, snd_clr, snd_miracle
    SOUND_CONFIGS = [
        ('snd_select', SELECT_SND_FILE, VOL_SELECT),
        ('snd_move', MOVE_SND_FILE, VOL_MOVE),
        ('snd_miracle', MIRACLE_SND_FILE, VOL_FLASH),
        ('snd_clr', CLR_SND_FILE, VOL_CLR),
    ]
    for var_name, file_name, volume in SOUND_CONFIGS:
        full_path = os.path.join(SND_DIR, file_name)
        snd_obj = safe_load(full_path, pygame.mixer.Sound, "Sound")
        if snd_obj:
            snd_obj.set_volume(volume)
        globals()[var_name] = snd_obj # Assign loaded sound to global variable

def load_all_resources():
    """Loads all necessary game resources: fonts, images, and sounds."""
    load_fonts()  # Load fonts first
    load_images() # Load images
    load_sounds() # Load sounds
    print("All resources loaded successfully.")   


### Game State Initialization
# Initialize game state variables
def init_game_state():
    global board, blks, imgs, ani_idx, selected, pre_clr, clr_ani_act, clr_ani_start_time, clr
    global shift, is_dragging, drag_start_mouse_pos, drag_start_blk_pos
    global miracle_btn_used, miracle_flash_ani_active, miracle_flash_phase, miracle_flash_phase_start_time
    global miracle_flash_blocks_to_bust, flash_effect_active, flash_effect_start_time, clr_miracle_played
    board = [row[:] for row in INIT_BOARD]
    blks = {k: v.copy() for k, v in INIT_BLKS.items()}
    imgs.clear()
    ani_idx = {bid: 0 for bid in blks}
    selected = board[0][0] if board[0][0] else 1
    pre_clr = False
    clr_ani_act = False
    clr_ani_start_time = 0
    clr = False
    shift = False
    is_dragging = False
    drag_start_mouse_pos = (0, 0)
    drag_start_blk_pos = (0, 0)
    miracle_btn_used = False
    miracle_flash_ani_active = False
    miracle_flash_phase = 0
    miracle_flash_phase_start_time = 0
    miracle_flash_blocks_to_bust = []
    flash_effect_active = False
    flash_effect_start_time = 0
    clr_miracle_played = False

def reset_game():
    """Resets the game state to the initial configuration."""
    init_game_state()  # Reinitialize game state variables
    load_all_resources()  # Reload all resources to ensure they are fresh
    print("Game state reset to initial configuration.")

### Game State Update

def update_game_state(now):
    """
    Updates the game state based on current conditions.
    This includes checking for game completion, handling animations, etc.
    """
    global pre_clr, clr_ani_act, clr_ani_start_time, clr
    global miracle_flash_ani_active, miracle_flash_phase
    global miracle_flash_phase_start_time, miracle_flash_blocks_to_bust
    global flash_effect_active, flash_effect_start_time
   
    # Oracle clear animation
    if clr_ani_act:
        elapsed_time = now - clr_ani_start_time
        if elapsed_time >= clr_ani_duration:
            clr_ani_act = False
            blks[1]['pos'] = (CLR_GOAL_X, CLR_GOAL_Y)  # Move Oracle to clear position
            clr = True

    # Miracle Flash animation
    if miracle_flash_ani_active:
        elapsed_phase_time = now - miracle_flash_phase_start_time
        if miracle_flash_phase == 1:
            if elapsed_phase_time >= MIRACLE_FLASH_ROTATION_DURATION:
                if miracle_flash_blocks_to_bust:
                    miracle_flash_phase = 2
                    miracle_flash_phase_start_time = now
                    if 'down' in ORACLE_IMG_IDX and ORACLE_IMG_IDX['down'] < len(imgs[1]):
                        ani_idx[1] = ORACLE_IMG_IDX['down']
                    else:
                        ani_idx[1] = 0
                else:
                    miracle_flash_ani_active = False
        elif miracle_flash_phase == 2:
            if elapsed_phase_time >= MIRACLE_FLASH_BUST_DELAY:
                if miracle_flash_blocks_to_bust:
                    bid_to_bust = miracle_flash_blocks_to_bust.pop(0)
                    blk_buster(bid_to_bust)
                    if miracle_flash_blocks_to_bust:
                        miracle_flash_phase = 1
                        miracle_flash_phase_start_time = now
                    else:
                        miracle_flash_ani_active = False
                else:
                    miracle_flash_ani_active = False

    # Flash effect
    if flash_effect_active:
        elapsed_time = now - flash_effect_start_time
        if elapsed_time >= FLASH_EFFECT_DURATION:
            flash_effect_active = False

### Drawing Functions (細分化)

def draw_blocks(offset_x, offset_y):
    # Draw blocks
    for bid, info in blks.items():
        bx, by = info['pos']
        bw, bh = info['size']
        rect = pygame.Rect(bx * CELL + offset_x, by * CELL + offset_y, bw * CELL, bh * CELL)
        
        # Handle Oracle's clear animation (exiting the board)
        if clr_ani_act and bid == 1:
            elapsed_time = pygame.time.get_ticks() - clr_ani_start_time
            if elapsed_time < clr_ani_duration:
                progress = elapsed_time / clr_ani_duration
                start_y_pixel = GOAL_Y * CELL + offset_y
                end_y_pixel = 5 * CELL + offset_y # Off-screen position
                current_y_pixel = start_y_pixel + (end_y_pixel - start_y_pixel) * progress
                rect.y = current_y_pixel
            else:
                rect.y = 5 * CELL + offset_y # Final off-screen position after animation

            # During clear animation, keep Oracle facing down
            if 'down' in ORACLE_IMG_IDX and ORACLE_IMG_IDX['down'] < len(imgs[1]):
                ani_idx[1] = ORACLE_IMG_IDX['down']
            else:
                ani_idx[1] = 0

        # Handle Oracle's rotation during Miracle Flash (Phase 1)
        elif miracle_flash_ani_active and bid == 1 and miracle_flash_phase == 1:
            elapsed_time = pygame.time.get_ticks() - miracle_flash_phase_start_time
            num_frames = 4 # Number of directional images for rotation
            frame_duration_in_cycle = MIRACLE_FLASH_ROTATION_DURATION / num_frames
            
            # Calculate current frame index for rotation
            current_frame_index_float = (elapsed_time / frame_duration_in_cycle) % num_frames
            current_frame_index = int(current_frame_index_float)

            # Define rotation order (counter-clockwise: UP -> LEFT -> DOWN -> RIGHT)
            rotation_order_keys = ['up', 'left', 'down', 'right']
            
            current_direction_key = rotation_order_keys[current_frame_index]
            
            # Update Oracle's image index based on rotation
            if current_direction_key in ORACLE_IMG_IDX:
                ani_idx[1] = ORACLE_IMG_IDX[current_direction_key]
            else:
                ani_idx[1] = 0 # Fallback

        # Get the appropriate image for the block
        blk_imgs = imgs[bid]
        img_to_draw = None
        if blk_imgs and blk_imgs[0]: # Ensure images exist
            if bid == 1: # Oracle uses indexed image for animation/direction
                img_to_draw = blk_imgs[ani_idx[bid]]
            else: # Other blocks use their static first image
                img_to_draw = blk_imgs[0]
        
        if img_to_draw:
            # Scale and blit the image to the screen
            SCRN.blit(pygame.transform.scale(img_to_draw, (bw * CELL, bh * CELL)), rect.topleft)
            # Draw selection border
            pygame.draw.rect(SCRN, SBLK_COL if selected == bid else (0,0,0,0), rect, BLK_BRDR) # Transparent border if not selected
        else: # Draw a colored rectangle if no image is loaded
            blk_color = SBLK_COL if selected == bid else BLK_COL
            if bid == 1: blk_color = ORACLE_COL # Specific color for Oracle placeholder
            pygame.draw.rect(SCRN, blk_color, rect)
            pygame.draw.rect(SCRN, FLR_COL, rect, BLK_BRDR) # Draw border even without image


def draw_buttons():
    if not clr_ani_act: 
        btn_rect = pygame.Rect(BTN_X, BTN_Y, BTN_W, BTN_H)
        if miracle_btn_used and not miracle_flash_ani_active and btn_img:
            scaled_btn_img = pygame.transform.scale(btn_img, (int(BTN_W), int(BTN_H)))
            SCRN.blit(scaled_btn_img, btn_rect) # Use scaled image
            pygame.draw.rect(SCRN, BTN_TXT_COL, btn_rect, 3) # Draw border around image
        else: # Fallback to colored rectangle if no image
            pygame.draw.rect(SCRN, BTN_COL, btn_rect)
            pygame.draw.rect(SCRN, BTN_TXT_COL, btn_rect, 3) # Draw border around rectangle
            # Draw Copyright text on the button
            font = pygame.font.Font(None, BTN_TXT_SIZE) # Using default font for button text
            txt = font.render("© SQUARE ENIX", True, BTN_TXT_COL)
            txt_rect = txt.get_rect(center=btn_rect.center)
            SCRN.blit(txt, txt_rect)
    retry_btn_rect = pygame.Rect(RETRY_BTN_X, RETRY_BTN_Y, RETRY_BTN_W, RETRY_BTN_H)
    if retry_btn_img:
       scaled_retry_img = pygame.transform.scale(retry_btn_img, (int(RETRY_BTN_W), int(RETRY_BTN_H)))
       SCRN.blit(scaled_retry_img, retry_btn_rect) 
       # pygame.draw.rect(SCRN, BTN_TXT_COL, btn_rect, 3) # Draw border around image
    else: # Fallback to colored rectangle if no image
        retry_btn_rect = pygame.Rect(RETRY_BTN_X, RETRY_BTN_Y, RETRY_BTN_W, RETRY_BTN_H)
        pygame.draw.rect(SCRN, RETRY_BTN_COL, retry_btn_rect)
        pygame.draw.rect(SCRN, RETRY_BTN_TXT_COL, retry_btn_rect, 2)
        font = pygame.font.Font(None, RETRY_BTN_TXT_SIZE)
        txt = font.render("RETRY", True, RETRY_BTN_TXT_COL)
        txt_rect = txt.get_rect(center=retry_btn_rect.center)
        SCRN.blit(txt, txt_rect)

def draw_effects():
    if flash_effect_active:
        elapsed_time = pygame.time.get_ticks() - flash_effect_start_time
        if elapsed_time < FLASH_EFFECT_DURATION:
            progress = elapsed_time / FLASH_EFFECT_DURATION
            MAX_FLASH_ALPHA = 180
            alpha = max(0, int(MAX_FLASH_ALPHA * (1.0 - progress)))
            flash_surface = pygame.Surface((SCRN_W, SCRN_H), pygame.SRCALPHA)
            flash_surface.fill((*FLASH_COLOR, alpha))
            SCRN.blit(flash_surface, (0, 0))        

def draw_message():
    if blks[1]['pos'] == (CLR_GOAL_X, CLR_GOAL_Y) and msg_font:
        txt = msg_font.render("THE ORACLE ESCAPED!", True, CLR_TXT_COL)
        txt_rect = txt.get_rect(center=(SCRN_W // 2, SCRN_H // 2 - CELL // 2))
        SCRN.blit(txt, txt_rect)
#    if clr:
#        msg = "Congratulations! You saved the Oracle!"
#        color = TXT_LIGHT
#    elif pre_clr:
#        msg = "The Oracle has reached the goal!"
#        color = TXT_DARK
#    elif miracle_btn_used and not miracle_flash_ani_active:
#        msg = "FF14-MATERIAL-USAGE-POLICY has changed! Their God start to destroy their-copyright-materials. You need to escape from castle within 5 turns!"
#        color = TXT_DARK
#    else:
#        msg = "Select a block to move or use the Miracle button."
#        color = TXT_DARK

def draw_all():
    SCRN.fill(FLR_COL)  # Fill the screen with floor color
    offset_x = WALL + BLK_BRDR / 2
    offset_y = WALL + BLK_BRDR / 2 - CELL / 2  # Adjust for block centering
    if wall_img:
        SCRN.blit(wall_img, (0,0))
    draw_blocks(offset_x, offset_y)  # Draw all blocks
    draw_buttons()  # Draw Miracle and Retry buttons
    draw_effects()  # Draw any active effects (e.g., flash)
    draw_message()  # Draw game messages


def blk_buster(bid):
    """
    Removes a block from the board and triggers a flash effect.
    Returns True if a block was successfully busted, False otherwise.
    """
    global board, blks, imgs, ani_idx
    global flash_effect_active, flash_effect_start_time

    if bid not in blks:
        print(f"Warning: Attempted to bust non-existent blk with ID {bid}. Skipping.")
        return False 

    if bid == 1: # The Oracle cannot be busted by this function
        print(f"Warning: Attempted to bust Oracle (ID 1) with blk_buster. Skipping.")
        return False

    bx, by = blks[bid]['pos']
    bw, bh = blks[bid]['size']

    # Clear old block position from the board grid
    for y_offset in range(bh):
        for x_offset in range(bw):
            if 0 <= by + y_offset < H and 0 <= bx + x_offset < W:
                if board[by + y_offset][bx + x_offset] == bid:
                    board[by + y_offset][bx + x_offset] = 0
    
    # Remove block data from dictionaries
    if bid in blks:
        del blks[bid]
    if bid in imgs:
        del imgs[bid]
    if bid in ani_idx:
        del ani_idx[bid]

    # Play sound effect for block destruction
    if snd_select: # Using select sound for block busting
        snd_select.play()
    else:
        print("Warning: snd_select is None. Block bust sound cannot be played.")

    # Trigger flash effect
    flash_effect_active = True
    flash_effect_start_time = pygame.time.get_ticks()
    
    print(f"Busted blk with ID {bid}!")
    return True

### Game Logic

def can_move(bid, d):
    """
    Checks if a block can move in a given direction.
    Returns True if the move is valid, False otherwise.
    """
    # Prevent movement during miracle animation
    if miracle_flash_ani_active:
        return False

    bx, by = blks[bid]['pos']
    bw, bh = blks[bid]['size']
    dx, dy = {'up': (0, -1), 'down': (0, 1), 'left': (-1, 0), 'right': (1, 0)}.get(d, (0, 0))
    nx, ny = bx + dx, by + dy # Calculate new potential position

    # Check if the new position is within board boundaries
    if not (0 <= nx <= W - bw and 0 <= ny <= H - bh):
        return False

    # Check for collisions with other blocks
    for y_offset in range(bh):
        for x_offset in range(bw):
            tx, ty = nx + x_offset, ny + y_offset
            # If the target cell is occupied by a different block, it's a collision
            if board[ty][tx] not in (0, bid):
                return False
    return True

def move(bid, d):
    """
    Moves a block on the board and updates its image (especially for Oracle).
    """
    global board, ani_idx
    bx, by = blks[bid]['pos']
    bw, bh = blks[bid]['size']

    # Prevent movement during miracle animation
    if miracle_flash_ani_active:
        return

    # Stop any ongoing select sound before moving
    if snd_select and pygame.mixer.get_busy():
        snd_select.stop()

    # Clear old block position on the board grid
    for y_offset in range(bh):
        for x_offset in range(bw):
            board[by + y_offset][bx + x_offset] = 0

    # Calculate new position and update block's data
    dx, dy = {'up': (0, -1), 'down': (0, 1), 'left': (-1, 0), 'right': (1, 0)}[d]
    nx, ny = bx + dx, by + dy
    blks[bid]['pos'] = (nx, ny)

    # Place block at new position on the board grid
    for y_offset in range(bh):
        for x_offset in range(bw):
            board[ny + y_offset][nx + x_offset] = bid

    # Update Oracle's image based on movement direction
    if bid == 1 and imgs[1] and d in ORACLE_IMG_IDX:
        target_idx = ORACLE_IMG_IDX[d]
        if target_idx < len(imgs[1]):
            ani_idx[1] = target_idx
        else:
            ani_idx[1] = 0 # Fallback to first image if specific not found
            print(f"Warning: Oracle image for direction '{d}' (IDX {target_idx}) not found. Using default.")

    # Play move sound effect
    if snd_move:
        snd_move.play()


### Game State Manipulation

def activate_miracle_flash():
    """
    Initiates the Miracle Flash animation sequence.
    This includes Oracle rotation, random block destruction, and related sound effects.
    """
    global miracle_flash_ani_active, miracle_flash_phase, miracle_flash_phase_start_time
    global miracle_flash_blocks_to_bust, ani_idx
    global miracle_btn_used

    if miracle_flash_ani_active: # If animation is already running, do nothing
        return
    miracle_btn_used = True # Mark that the Miracle button has been used

    # Initialize animation state
    miracle_flash_ani_active = True
    miracle_flash_phase = 1 # Start with Oracle rotation phase
    miracle_flash_phase_start_time = pygame.time.get_ticks()
    
    # Identify all blocks to be destroyed (all except Oracle)
    oracle_bid = 1
    miracle_flash_blocks_to_bust = [bid for bid in blks.keys() if bid != oracle_bid]
    random.shuffle(miracle_flash_blocks_to_bust) # Randomize destruction order
    
    # Reset Oracle's orientation to default (down) for the start of rotation animation
    if 'down' in ORACLE_IMG_IDX and ORACLE_IMG_IDX['down'] < len(imgs[1]):
        ani_idx[1] = ORACLE_IMG_IDX['down']
    else:
        ani_idx[1] = 0
    if snd_miracle:
        snd_miracle.play()


def start_clr_ani(current_time):
    """
    Initiates the Oracle's clear (exit) animation.
    """
    global clr_ani_act, clr_ani_start_time
    clr_ani_act = True
    clr_ani_start_time = current_time
    print("Starting Oracle clear animation.")
    if snd_clr:
        snd_clr.play()

### Event Handling 

def handle_events():
    """Processes all Pygame events such as quit, mouse clicks, and ESCkey presses."""
    global running, selected, is_dragging, drag_start_mouse_pos
    global drag_start_blk_pos
    global pre_clr, clr_ani_act, clr_ani_start_time, clr
    global miracle_flash_ani_active

    for e in pygame.event.get():
        if e.type == pygame.QUIT:
            running = False
        elif e.type == pygame.MOUSEBUTTONDOWN:
            handle_mouse_button_down(e)
        elif e.type == pygame.MOUSEMOTION:
            handle_mouse_motion(e)
        elif e.type == pygame.MOUSEBUTTONUP:
            handle_mouse_button_up(e)

def handle_events():
    """Processes all Pygame events such as quit, mouse clicks, and key presses."""
    global running, selected, is_dragging, drag_start_mouse_pos, drag_start_blk_pos, shift
    global pre_clr, clr_ani_act, clr_ani_start_time, clr
    global miracle_flash_ani_active

    for e in pygame.event.get():
        if e.type == pygame.QUIT:
            running = False
        elif e.type == pygame.MOUSEBUTTONDOWN:
            handle_mouse_button_down(e)
        elif e.type == pygame.MOUSEMOTION:
            handle_mouse_motion(e)
        elif e.type == pygame.MOUSEBUTTONUP:
            handle_mouse_button_up(e)
        elif e.type == pygame.KEYDOWN:
            # ESCキーでゲーム終了
            if e.key == pygame.K_ESCAPE:
                print("ESC key pressed. Exiting game.")
                running = False

def handle_mouse_button_down(e):
    global selected, is_dragging, drag_start_mouse_pos, drag_start_blk_pos
    global pre_clr, clr_ani_act, miracle_flash_ani_active

    mouse_x, mouse_y = e.pos

    # --- まずRETRYボタンの判定を最初に行う ---
    retry_btn_rect = pygame.Rect(RETRY_BTN_X, RETRY_BTN_Y, RETRY_BTN_W, RETRY_BTN_H)
    if retry_btn_rect.collidepoint(mouse_x, mouse_y):
        reset_game()
        return  # 他の処理は行わない

    # --- それ以外の操作は従来通り制限 ---
    if not (clr_ani_act or blks[1]['pos'] == (CLR_GOAL_X,CLR_GOAL_Y) or miracle_flash_ani_active):
        # ...既存のブロック選択やMIRACLEボタン判定...
        # Check if click is on a game block
        grid_x = int((mouse_x - (WALL + BLK_BRDR / 2)) // CELL)
        grid_y = int((mouse_y - (WALL + BLK_BRDR / 2 - CELL * 0.5)) // CELL)
        if 0 <= grid_x < W and 0 <= grid_y < H:
            clicked_bid = board[grid_y][grid_x]
            if clicked_bid != 0:
                if selected != clicked_bid and snd_select:
                    snd_select.play()
                selected = clicked_bid
                is_dragging = True
                drag_start_mouse_pos = e.pos
                drag_start_blk_pos = blks[selected]['pos']

        # Check if click is on the MIRACLE button
        btn_rect = pygame.Rect(BTN_X, BTN_Y, BTN_W, BTN_H)
        if btn_rect.collidepoint(mouse_x, mouse_y):
            activate_miracle_flash()

def handle_mouse_motion(e):
    """Handles mouse movement for dragging blocks."""
    global is_dragging, selected, drag_start_mouse_pos, drag_start_blk_pos
    global pre_clr, clr_ani_act, miracle_flash_ani_active

    # Only process if dragging is active and not in an animation state
    if is_dragging and selected and not (clr_ani_act or blks[1]['pos'] == (CLR_GOAL_X,CLR_GOAL_Y) or miracle_flash_ani_active):
        current_mouse_x, current_mouse_y = e.pos
        start_mouse_x, start_mouse_y = drag_start_mouse_pos
        
        delta_x = current_mouse_x - start_mouse_x
        delta_y = current_mouse_y - start_mouse_y

        drag_threshold = CELL * 0.7 # Threshold for considering a drag a "move"
        moved_direction = None
        
        # Determine movement direction based on which delta is larger
        if abs(delta_x) > drag_threshold:
            if delta_x > 0: moved_direction = 'right'
            else: moved_direction = 'left'
        
        if abs(delta_y) > drag_threshold:
            if abs(delta_y) > abs(delta_x): # Prioritize vertical movement if both large
                if delta_y > 0: moved_direction = 'down'
                else: moved_direction = 'up'

        if moved_direction:
            # Trigger Oracle clear animation if it's at the goal and moved down
            if pre_clr and selected == 1 and moved_direction == 'down':
                start_clr_ani(pygame.time.get_ticks())
            elif can_move(selected, moved_direction): # Move the block if possible
                move(selected, moved_direction)
                # Reset drag start for continuous dragging
                drag_start_mouse_pos = e.pos
                drag_start_blk_pos = blks[selected]['pos']
            else: # If cannot move, reset drag start to prevent instant re-trigger
                drag_start_mouse_pos = e.pos
                drag_start_blk_pos = blks[selected]['pos']

def handle_mouse_button_up(e):
    """Handles mouse button up events to stop dragging."""
    global is_dragging
    is_dragging = False

def main_loop():
    """Main game loop that handles events, updates the game state, and draws everything."""
    clock = pygame.time.Clock()
    FPS = 60  # Frames per second
    global running, pre_clr, clr_miracle_played
    running = True
    while running:
        now = pygame.time.get_ticks()  # Get current time in milliseconds
        update_game_state(now)  # Update game state based on current conditions
        handle_events()  # Process all events
        draw_all()  # Draw all game elements
        if blks[1]['pos'] == (GOAL_X, GOAL_Y) and not pre_clr and not clr_ani_act:
            pre_clr = True
        if blks[1]['pos'] == (CLR_GOAL_X, CLR_GOAL_Y) and not clr_ani_act and not clr:
            if snd_miracle and not miracle_flash_ani_active and not clr_miracle_played:
                snd_miracle.play()
                clr_miracle_played = True
        pygame.display.flip()  # Update the display
        clock.tick(FPS)  # Maintain the frame rate
    print(f"Game exited. Final state: pre_clr={pre_clr}, clr={clr}, miracle_btn_used={miracle_btn_used}")
  
    pygame.quit()  # Uninitialize Pygame modules

### Start the game
if __name__ == "__main__":
    pygame.init()  # Initialize Pygame
    pygame.mixer.init()  # Initialize Pygame mixer for sound
    SCRN = pygame.display.set_mode((SCRN_W, SCRN_H))  # Set the display mode
    pygame.display.set_caption("Save The Oracle")  # Set the window title
    init_game_state()  # Initialize game state variables
    load_all_resources()  # Load all resources (fonts, images, sounds)
    main_loop()  # Start the main game loop
