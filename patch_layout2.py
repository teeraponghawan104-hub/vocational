import os

filepath = "src/components/Part2.tsx"
with open(filepath, "r") as f:
    content = f.read()

content = content.replace(
    '<div className="flex items-center gap-3 sm:gap-4 flex-1">',
    '<div className="flex items-center gap-3 sm:gap-4 flex-1 w-full lg:w-auto">'
)

content = content.replace(
    '<div className="grid grid-cols-1 sm:grid-cols-3 gap-2 shrink-0 lg:w-auto w-full">',
    '<div className="grid grid-cols-1 sm:grid-cols-3 gap-2 shrink-0 lg:w-[450px] xl:w-[500px] w-full">'
)

with open(filepath, "w") as f:
    f.write(content)

