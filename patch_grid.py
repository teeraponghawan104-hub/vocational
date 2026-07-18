import os

files = [
    "src/components/Part1.tsx",
    "src/components/Part2.tsx",
    "src/components/Part3.tsx"
]

for filepath in files:
    with open(filepath, "r") as f:
        content = f.read()

    # Part 1 & 3 Replacement
    content = content.replace(
        '<div key={q.id} className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:border-slate-300 transition-colors">',
        '<div key={q.id} className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-4 hover:border-slate-300 transition-colors items-center">'
    )
    
    # Left side (Part 1 & 3)
    content = content.replace(
        '<div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">',
        '<div className="flex items-center gap-3 sm:gap-4 col-span-1 lg:col-span-5 xl:col-span-6 min-w-0">'
    )
    # Right side (Part 1 & 3)
    content = content.replace(
        '<div className="grid grid-cols-1 sm:grid-cols-3 gap-2 shrink-0 lg:w-[450px] xl:w-[500px] w-full">',
        '<div className="grid grid-cols-1 sm:grid-cols-3 gap-2 col-span-1 lg:col-span-7 xl:col-span-6 w-full">'
    )
    
    # Right side (older version if somehow it wasn't replaced)
    content = content.replace(
        '<div className="grid grid-cols-1 sm:grid-cols-3 gap-2 shrink-0 lg:w-auto w-full">',
        '<div className="grid grid-cols-1 sm:grid-cols-3 gap-2 col-span-1 lg:col-span-7 xl:col-span-6 w-full">'
    )

    # Part 2 Replacement
    content = content.replace(
        '<div key={sub.id} className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:border-slate-300 transition-colors">',
        '<div key={sub.id} className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-4 hover:border-slate-300 transition-colors items-center">'
    )

    with open(filepath, "w") as f:
        f.write(content)

