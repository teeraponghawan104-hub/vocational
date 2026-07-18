import os

files = [
    "src/components/Part1.tsx",
    "src/components/Part2.tsx",
    "src/components/Part3.tsx"
]

for filepath in files:
    with open(filepath, "r") as f:
        content = f.read()

    # remove w-full from the flex-1 container to prevent flexbox overflow on desktop
    content = content.replace(
        '<div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0 w-full">',
        '<div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">'
    )

    with open(filepath, "w") as f:
        f.write(content)

