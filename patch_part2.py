import os

filepath = "src/components/Part2.tsx"
with open(filepath, "r") as f:
    content = f.read()

# 1. Update handleSelect to allow toggling off
old_handle_select = """      // If we are selecting a choice, make sure no other sub in this question has this choice
      // Because A, B, X must not be duplicated within the same question.
      if (choice !== null) {
        Object.keys(qAns).forEach(key => {
          if (qAns[parseInt(key)] === choice && parseInt(key) !== subId) {
            qAns[parseInt(key)] = null; // unset the duplicate
          }
        });
      }
      
      qAns[subId] = choice;"""

new_handle_select = """      if (qAns[subId] === choice) {
        qAns[subId] = null;
      } else {
        if (choice !== null) {
          Object.keys(qAns).forEach(key => {
            if (qAns[parseInt(key)] === choice && parseInt(key) !== subId) {
              qAns[parseInt(key)] = null; // unset the duplicate
            }
          });
        }
        qAns[subId] = choice;
      }"""

content = content.replace(old_handle_select, new_handle_select)

# 2. Remove usedA disabled logic
content = content.replace("disabled={usedA}", "")
content = content.replace("disabled={usedB}", "")
content = content.replace("disabled={usedX}", "")

# 3. Fix styling so it doesn't look unclickable
content = content.replace(
    'usedA ? "border-slate-200 text-slate-400 cursor-not-allowed bg-slate-50 opacity-50" : "border-slate-200 text-slate-600 hover:bg-slate-50 active:bg-slate-100"',
    'usedA ? "border-slate-200 text-slate-400 hover:bg-slate-50 active:bg-slate-100 bg-slate-50 opacity-70" : "border-slate-200 text-slate-600 hover:bg-slate-50 active:bg-slate-100"'
)

content = content.replace(
    'usedB ? "border-slate-200 text-slate-400 cursor-not-allowed bg-slate-50 opacity-50" : "border-slate-200 text-slate-600 hover:bg-slate-50 active:bg-slate-100"',
    'usedB ? "border-slate-200 text-slate-400 hover:bg-slate-50 active:bg-slate-100 bg-slate-50 opacity-70" : "border-slate-200 text-slate-600 hover:bg-slate-50 active:bg-slate-100"'
)

content = content.replace(
    'usedX ? "border-slate-200 text-slate-400 cursor-not-allowed bg-slate-50 opacity-50" : "border-slate-200 text-slate-600 hover:bg-slate-50 active:bg-slate-100"',
    'usedX ? "border-slate-200 text-slate-400 hover:bg-slate-50 active:bg-slate-100 bg-slate-50 opacity-70" : "border-slate-200 text-slate-600 hover:bg-slate-50 active:bg-slate-100"'
)

with open(filepath, "w") as f:
    f.write(content)

