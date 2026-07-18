import os

files = [
    "src/components/Part1.tsx",
    "src/components/Part3.tsx"
]

for filepath in files:
    with open(filepath, "r") as f:
        content = f.read()

    # Allow toggling off
    content = content.replace(
        "const newAnswers = { ...answers, [qId]: choice };",
        "const newAnswers = { ...answers, [qId]: answers[qId] === choice ? null : choice };"
    )

    with open(filepath, "w") as f:
        f.write(content)

