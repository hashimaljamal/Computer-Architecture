# Interactive Lessons

by Hashim AlJamal

A small website with one tab per lesson. Each tab holds an interactive solution: enter your own numbers and see the answer worked out and drawn.

## Lessons

| Tab | What it does |
|---|---|
| **Instruction Set Encoding** | Turn LC-3 assembly into binary and hexadecimal, with every instruction broken into its bit fields. Holds the four practice questions and their printed answer key. |
| **Pipelining** | Find the data dependencies in a piece of LC-3 code and see them drawn as arrows. Holds the four pipelining practice questions and their printed answer key. |
| **Memory System Design** | Design a RAM memory system. Describe the RAM chips and the processor, and it works out how many chips you need, how they are arranged, and draws the schematic. |
| **Cache** | Work out the tag / index / offset format of a main memory address for any cache, find the set and block of an address, and solve for unknown address digits. Holds the eight cache practice questions and their printed answer key. |

### Memory design

Each box has three linked values. **Enter any two and the third is calculated.**

| Box | Values | Relationship |
|---|---|---|
| RAM memory | IC address lines (m), IC data width (w), memory available per IC | size = 2^m × w bits |
| Processor memory | address lines, data bus, memory required | size = 2^address lines × data bus bits |

- The two boxes you edited most recently are the inputs. The other one is calculated.
- **Clear boxes** empties a box so you can enter two fresh values.
- Changing the unit on a *calculated* size converts the number. On a size you *entered*, it changes the quantity.
- **Ex 1 to Ex 4** load the four worked examples.
- The schematic draws up to 64 rows × 64 columns. Big designs appear in a scrollable frame with zoom buttons.

How the design works:

1. Words needed = memory size ÷ data bus width, so the processor needs `M = log2(words)` address lines.
2. **Columns** = bus width ÷ IC width (chips side by side widen the data bus).
3. **Rows** = 2^(M − m) (chips stacked to add depth). A decoder on the top `M − m` address lines picks the row; AS drives its enable.
4. R/W\* branches: R goes to OE, and an inverted copy (W) goes to WE.

### LC-3 encoding

- **Q1 to Q4** load the four practice questions. Each question's assembly is editable, and so is the start address, so you can try your own programs.
- The table is the memory map: address, instruction, binary and hex. Click an instruction to see its 16 bits split into opcode, registers, immediates and fixed bits, with a note for each field. For branches it shows the target address, the PC value and the offset arithmetic. Under the diagram, the binary is shown a nibble at a time next to its hex digit.
- **Solution** compares the result with the printed answer key. All hex values in the key are right; the tool lists the few places where the key's binary column or instruction labels have typos (Q3: two binary values; Q4: three binary values and two mislabelled instructions).
- **Practice** hides the answers and gives you boxes for the binary and hex of every row. **Check answers** marks each row, **Show answers** fills them in, and **Clear** starts over. The explanation of a row unlocks once you have checked it.
- **LC-3 instruction formats** (at the bottom) lists all the formats from the LC-3 instruction-format chart.
- The assembler understands the instructions above plus `HALT/GETC/OUT/PUTS/IN`, `ORG` / `.ORIG`, `.FILL`, `.BLKW`, `.STRINGZ`, bare data words (`IL1: 0x00FF`), labels with or without a colon, and `;` `%` `//` comments. A label operand becomes a PC-relative offset; a plain number (`LEA R4, #5`) is used as the offset directly. Mistakes are listed with their line numbers instead of being guessed.

### Pipelining

- **Q1 to Q4** load the four practice questions. The code is editable, so you can try your own fragments.
- The table lists what each instruction **reads** and **writes**. ADD, AND, NOT, LD, LDI and LDR also set the *status register* (shown as `status`); a branch reads it. LEA does not set it (to change that, add `LEA: 1` to `SETS_STATUS` in `deps.js`). `SUB` is accepted because Question 1 uses it.
- The diagram draws an arrow from the instruction that writes a value to the instruction that needs it. Arrows going down sit on the right; arrows going up (loops, branch targets) sit on the left. Dashed means loop-carried, dotted means branch target. Click an instruction to highlight only its arrows.
- A dependency is found by looking back from each read for the **nearest** earlier write. On top of that:
  - a branch depends on the nearest earlier instruction that set the status register;
  - the instruction a branch goes to depends on the branch (a *control* dependency, as the key lists for the loop label);
  - inside a loop, a read with no earlier write in the loop depends on the **last write in the loop** (*loop-carried*);
  - an instruction is never listed as depending on itself.
- **Solution** compares the result with the printed key. Every dependency in the key is found. The tool notes one thing about the key: in Q1 and Q2 it writes a register (R4, R6) where a branch is really waiting for the status register.
- **Practice** hides the answers. Add each dependency by picking the instruction, the instruction it depends on and the register. **Check answers** marks every entry and says why a wrong one is wrong, **Show answers** fills the list in, and **Clear** starts over. Entries that are valid but missing from the printed key (possible with your own code) are accepted but not required.
- A branch to a label that is not in the code (such as `Done` in Q4) gets no control dependency, and the page says so.
- Comments start with `;`, `//` or `%`, and also with `#` when it is not a number, so `#Inst-1` is a comment but `#-1` is a value.

### Cache

- **Q1 to Q8** load the eight practice questions. Every box is editable (memory size or address bits, cache size, bytes per line, ways), so you can try your own cache. Type the memory size *or* the address bits and the other follows. Questions with several designs (Q2 to Q5) get buttons to switch between direct-mapped and the associative versions.
- The working shows cache lines, sets, offset, index and tag bits, and draws the address format.
- **Where does an address go?** Enter a hex address to see it in binary, split into tag, index and offset, with its set number and block number.
- **Same set, unknown digits** takes two addresses with unknown hex digits (`X`, `Y`, `Z`) and lists the values that put both in the same set. If the digits depend on each other it lists the working combinations.
- **Solution** compares the result with the printed key. Every answer in the key is right; the tool notes one slip in the written working of Q2 (the 8-way tag is written as 11 bits, but the drawn address, 9 | 11 | 7, is correct).
- **Practice** hides the answers and gives you a box for each one. **Check answers** marks each box and gives a hint for the wrong ones, **Show answers** fills them in, and **Clear** starts over.
- Main memory is taken to be byte-addressable, and sizes must be powers of 2.

## Using the site

- On a big screen (at least 900 px wide and 560 px tall) the page fits the window: each lesson has its inputs on the left and its results on the right, and each side scrolls on its own if it is long. On phones and small windows the two sides stack into one normal scrolling page.
- Click a tab, or use the **left/right arrow keys**, **Home** and **End** when a tab has focus.
- Every tab has its own link, for example `https://<you>.github.io/<repo>/#memory-design`. Send that link to open a lesson directly.
- The sun/moon button in the top corner switches light and dark mode. The choice is remembered in the browser.

## Adding a lesson

Each lesson lives in its own folder under `lessons/` and plugs into the tabs with one line. Tabs appear in the order the scripts are listed in `index.html`. The folder `lessons/_template/` is a working starting point.

1. **Copy the template.** Copy `lessons/_template/` to `lessons/<your-lesson>/` and rename the files inside (for example `my-lesson.js` and `my-lesson.css`). Edit the `Lessons.register({ id, title, mount })` call at the bottom of the JS file:
   - `id`: lowercase letters, digits and dashes; it becomes the link (`#your-lesson`).
   - `title`: the text on the tab.
   - `mount(panel)`: fills the panel the first time the tab is opened.
2. **List the files in `index.html`.** Add a `<link>` for the stylesheet in the `<head>`, and a `<script defer src="...">` for each script at the bottom (after `shell.js`). Both spots have a comment marking where lessons go.
3. **(Optional) Add tests.** Put the lesson's math in a file with no page code, and add `tests/<your-lesson>.test.js`. It is picked up automatically by `npm test`.

Layout: put the inputs in `<div class="col-a">` and the results in `<div class="col-b">`, both inside `<div class="split">` (the template shows this). Set `--left` on your lesson's class to change the left column's width.

Rules that keep lessons from clashing (the template repeats them):

- Fill only your panel, and look things up inside it (`panel.querySelector(...)`), not with `document.getElementById`. Avoid `id="..."` in your markup; use `data-...` attributes or classes.
- Listen for events on the panel, not on `document`.
- Prefix any SVG ids (for example `id="mylesson-arrow"`), because all lessons share one page.
- Nest your CSS under your lesson's class (for example `.lesson-mylesson`), and use the shared colour variables from `style.css` (`var(--tpri)`, `var(--bd)`, `var(--ba)`, and so on) so your lesson follows light and dark mode.

## Files

```
index.html                     page shell and the list of lessons
style.css                      colours, page, tabs, and shared controls
shell.js                       tabs, theme toggle, lesson registry
lessons/
  memory-design/
    memory-design.js           the lesson's page (builds its panel)
    memory-design.css          the lesson's styles
    logic.js                   the "enter any two values" math (no page code)
    schematic.js               builds the SVG schematic (no page code)
  lc3-encoding/
    lc3-encoding.js            the lesson's page (builds its panel)
    lc3-encoding.css           the lesson's styles
    lc3.js                     the LC-3 assembler and instruction formats (no page code)
    questions.js               the four questions, the printed key, and the key comparison
  pipelining/
    pipelining.js              the lesson's page (builds its panel)
    pipelining.css             the lesson's styles
    deps.js                    reads LC-3 code and finds the data dependencies (no page code)
    diagram.js                 builds the SVG dependency arrows (no page code)
    questions.js               the four questions, the printed key, and the key comparison
  cache/
    cache.js                   the lesson's page (builds its panel)
    cache.css                  the lesson's styles
    logic.js                   the address-format math and the unknown-digit solver (no page code)
    questions.js               the eight questions, the printed key, and the practice boxes
  _template/                   copy this to start a new lesson
tests/
  harness.js                   tiny test helper
  memory-design.test.js        tests for the Memory design lesson
  lc3-encoding.test.js         tests for the LC-3 encoding lesson
  pipelining.test.js           tests for the Pipelining lesson
  cache.test.js                tests for the Cache lesson
test.js                        runs every tests/*.test.js
.github/workflows/test.yml     runs the tests on every push
```

## Run it locally

No build step. Open `index.html` in a browser, or serve the folder:

```
npx serve .
```

## Put it on GitHub Pages

1. Push this folder to a GitHub repository.
2. In the repository go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, pick `main` and `/ (root)`, and save.
4. After a minute the site is live at `https://<your-username>.github.io/<repository-name>/`.

## Tests

```
npm test
```

No packages to install. The LC-3 tests cover every instruction format against hand-worked values, label and offset handling, error messages, the four questions against the printed key, and the exact list of mistakes in that key.

The Pipelining tests cover what every instruction reads and writes, comments and label styles, error messages, forward branches and loops (including loop-carried dependencies), all four questions against the printed key, the practice marking and its hints, and the diagram.

The Cache tests cover the address format of every printed design, the set and block of every printed address, the unknown-digit answers (checked by brute force), fully associative and direct-mapped edge cases, error messages, 32-bit addresses, and the practice marking.

For the Memory design lesson the tests cover:

- entering every ordered pair of values in both boxes, typed one digit at a time, from both empty and filled boxes
- unit changes, error messages and recovering from them
- the four worked examples (rows, columns, IC count, decoder size)
- the schematic for sizes from 1 × 1 up to 64 × 64
