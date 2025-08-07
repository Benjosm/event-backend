import pytest
from unittest.mock import patch, MagicMock
from spacy.lang.en import English
from nlp_service.src.spacy_pipeline import get_spacy_pipeline

class MockSpacyPipeline:
    """Mock spaCy pipeline instance for testing."""
    def __init__(self, name):
        self.name = name
        self.component_names = ["tokenizer", "tagger", "ner"]
        self.user_data = {"model_name": name}

def test_pipeline_initialization_success():
    """Test successful pipeline initialization with required components."""
    with patch('nlp_service.src.spacy_pipeline.spacy.load') as mock_load:
        mock_load.return_value = MockSpacyPipeline("en_core_web_sm")
        nlp = get_spacy_pipeline()
        
        assert 'tokenizer' in nlp.component_names
        assert 'tagger' in nlp.component_names
        assert 'ner' in nlp.component_names
        mock_load.assert_called_once_with("en_core_web_sm")

def test_pipeline_caching_behavior():
    """Test LRU cache respects max_size=2 and evicts oldest entry."""
    model_names = ["en_core_web_sm", "en_core_web_md", "en_core_web_lg"]
    
    with patch('nlp_service.src.spacy_pipeline.spacy.load') as mock_load:
        # Configure mock to return different pipeline instances
        created_pipelines = {}
        def load_model(name, **kwargs):
            if name not in created_pipelines:
                created_pipelines[name] = MockSpacyPipeline(name)
            return created_pipelines[name]
        
        mock_load.side_effect = load_model

        # First two unique calls should create new instances
        nlp1 = get_spacy_pipeline(model_names[0])
        nlp2 = get_spacy_pipeline(model_names[1])
        assert mock_load.call_count == 2

        # Third call should evict first entry
        nlp3 = get_spacy_pipeline(model_names[2])
        assert mock_load.call_count == 3
        
        # Re-requesting first model should reload (cache miss)
        nlp4 = get_spacy_pipeline(model_names[0])
        assert mock_load.call_count == 4
        assert nlp4.name == model_names[0]

def test_pipeline_error_handling():
    """Test error handling when model is missing."""
    with patch('nlp_service.src.spacy_pipeline.spacy.load') as mock_load:
        mock_load.side_effect = OSError("Model not found")
        
        with pytest.raises(OSError) as exc_info:
            get_spacy_pipeline()
        
        assert "SpaCy 'en_core_web_sm' model not found" in str(exc_info.value)

def test_sentence_processing():
    """Test actual text processing with required NLP features."""
    # Note: Requires spacy and en_core_web_sm to be installed
    nlp = get_spacy_pipeline()
    text = "Apple is looking at buying U.K. startup for $1 billion"
    doc = nlp(text)
    
    # Basic validation that processing occurred
    assert len(doc) > 0  # Tokens exist
    assert any(token.pos_ for token in doc)  # POS tags generated
    assert len(doc.ents) > 0  # Entities detected

def test_cache_isolation():
    """Ensure cache works with same model name (no extra loads)."""
    with patch('nlp_service.src.spacy_pipeline.spacy.load') as mock_load:
        mock_load.return_value = MockSpacyPipeline("en_core_web_sm")
        
        nlp1 = get_spacy_pipeline("en_core_web_sm")
        nlp2 = get_spacy_pipeline("en_core_web_sm")
        
        assert mock_load.call_count == 1
        assert nlp1 is nlp2
