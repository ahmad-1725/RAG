from app.llm import generate_answer


prompt = "Explain machine learning in two sentences."

answer = generate_answer(prompt)

print(answer)