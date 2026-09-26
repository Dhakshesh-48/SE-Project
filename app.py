from flask import Flask, render_template, request
from analysis import analyze_requirements_text, DEFAULT_REQUIREMENTS

app = Flask(__name__)


@app.route('/')
def index():
    return render_template('index.html', default_text=DEFAULT_REQUIREMENTS)


@app.route('/analyze', methods=['POST'])
def analyze():
    raw_text = request.form.get('requirements', '').strip()
    if not raw_text:
        raw_text = DEFAULT_REQUIREMENTS
    result = analyze_requirements_text(raw_text)
    return render_template('results.html', result=result, raw_text=raw_text)


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
