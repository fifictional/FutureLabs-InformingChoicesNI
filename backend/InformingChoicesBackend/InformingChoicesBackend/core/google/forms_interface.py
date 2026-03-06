
from InformingChoicesBackend.core.google.forms_service import get_forms_service

class FormsInterface:
    def __init__(self):
        try:
            self.service = get_forms_service()
        except Exception as e:
            print(f"Error initializing FormsInterface: {e}")
            self.service = None
