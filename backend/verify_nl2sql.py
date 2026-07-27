from app.agents.nl2sql import run_nl2sql

questions = [
    'Which products are our best sellers? Show top 5 with their names.',
    'Which products are barely selling? Show the slowest moving items.',
    'Which product category has the most variety in our warehouse?'
]

for q in questions:
    print(f'Q: {q}')
    result = run_nl2sql(q)
    print(f'A: {result["answer"]}')
    print()
