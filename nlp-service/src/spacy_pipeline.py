import spacy
from functools import lru_cache

@lru_cache(maxsize=2)
def get_spacy_pipeline(model_name="en_core_web_sm"):
    """
    Returns a cached spaCy pipeline instance for the specified model.
    
    Args:
        model_name (str): Name of the spaCy model to load (default: en_core_web_sm)
    
    Returns:
        spacy.Language: Configured spaCy pipeline
    
    Raises:
        OSError: If the specified model is not installed
    """
    try:
        return spacy.load(model_name)
    except OSError:
        raise OSError(
            f"SpaCy '{model_name}' model not found. "
            f"Run: python -m spacy download {model_name}"
        ) from None
