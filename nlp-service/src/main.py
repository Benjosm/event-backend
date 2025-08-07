from flask import Flask, request, jsonify
from spacy_pipeline import get_spacy_pipeline

app = Flask(__name__)

@app.route('/analyze', methods=['POST'])
def analyze_text():
    data = request.get_json()
    text = data.get('text', '').strip()
    
    if not text:
        return jsonify({'error': 'Text input is required'}), 400

    try:
        # Get the spaCy pipeline
        nlp = get_spacy_pipeline()
        # Process the text
        doc = nlp(text)
        
        # Extract tokens
        tokens = [token.text for token in doc]
        
        # Extract POS tags
        pos = {}
        for token in doc:
            if token.text not in pos:
                pos[token.text] = []
            pos[token.text].append(token.pos_)
        
        # Extract named entities
        entities = []
        for ent in doc.ents:
            entities.append({
                'text': ent.text,
                'type': ent.label_
            })
        
        result = {
            'tokens': tokens,
            'pos': pos,
            'entities': entities
        }
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
