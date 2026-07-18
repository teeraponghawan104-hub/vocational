import re

with open("src/data.ts", "r") as f:
    content = f.read()

# We need to find the part1Questions array and add image properties
# Let's match line by line in part1Questions
lines = content.split('\n')
new_lines = []
in_part1 = False

for line in lines:
    if line.startswith('export const part1Questions = ['):
        in_part1 = True
        new_lines.append(line)
        continue
    
    if in_part1:
        if line.strip() == '];':
            in_part1 = False
            new_lines.append(line)
            continue
            
        # Match question pattern: { id: 1, text: "...", icon: ... }
        match = re.match(r'(\s*\{ id: (\d+),.*?\})(\s*,?)', line)
        if match:
            obj = match.group(1)
            qid = int(match.group(2))
            comma = match.group(3)
            
            # Remove existing image if any
            obj = re.sub(r',\s*image:\s*"[^"]+"', '', obj)
            
            # Add image property at the end before closing brace
            # e.g. { id: 1, text: "...", icon: Dumbbell } -> { id: 1, text: "...", icon: Dumbbell, image: "/1 (1).png" }
            obj = re.sub(r'\s*\}$', f', image: "/1 ({qid}).png" }}', obj)
            
            new_lines.append(obj + comma)
        else:
            new_lines.append(line)
    else:
        new_lines.append(line)

with open("src/data.ts", "w") as f:
    f.write('\n'.join(new_lines))

