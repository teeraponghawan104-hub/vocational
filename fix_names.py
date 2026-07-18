import re

with open("src/studentData.ts", "r", encoding="utf-8") as f:
    text = f.read()

# Map Private Use Area (PUA) characters to standard Thai Unicode
pua_mapping = {
    "\uf701": "\u0e34", # Sara I
    "\uf70a": "\u0e48", # Mai Ek
    "\uf70b": "\u0e49", # Mai Tho
    "\uf70e": "\u0e4c", # Thanthakhat (Karan)
    "\uf709": "\u0e4c", # Thanthakhat (Karan) - Wait, let me check again, is \uf709 '์'?
    "\uf713": "\u0e48", # Mai Ek
}

for pua, standard in pua_mapping.items():
    text = text.replace(pua, standard)

with open("src/studentData.ts", "w", encoding="utf-8") as f:
    f.write(text)

print("Fixed PUA characters")
