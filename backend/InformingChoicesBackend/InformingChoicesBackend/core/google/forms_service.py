"""
Provides a Forms service to interact with the Google Forms API.
"""

from __future__ import annotations

import os

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build, Resource

# Authorisation scopes defining the level of access being granted to the app
SCOPES = [
    "https://www.googleapis.com/auth/forms.body",
    "https://www.googleapis.com/auth/forms.responses.readonly",
    "https://www.googleapis.com/auth/drive.file",
]


def get_forms_service() -> Resource:
    credentials = None
    token_path = "credentials/token.json"

    if os.path.exists(token_path):
        credentials = Credentials.from_authorized_user_file(token_path, SCOPES)

    if not credentials or not credentials.valid:
        if credentials and credentials.expired and credentials.refresh_token:
            credentials.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file("credentials/credentials.json", SCOPES)
            credentials = flow.run_local_server(port=0)

        with open(token_path, "w", encoding="utf-8") as f:
            f.write(credentials.to_json())

    return build("forms", "v1", credentials=credentials)