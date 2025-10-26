# ElevenLabs Text-to-Speech Integration

This document explains how to use the new ElevenLabs text-to-speech feature in the INFINITO AI application.

## Overview

The application now includes ElevenLabs text-to-speech integration that allows users to convert AI-generated responses into audio. This feature enhances accessibility and provides an alternative way to consume AI responses.

## Setup

### 1. Configure ElevenLabs API Key

1. Go to the AI Settings page (`/ai-settings`)
2. Navigate to the "Audio & Speech" tab
3. Find the ElevenLabs service
4. Enter your ElevenLabs API key
5. Click "Save" to store the key

### 2. Get ElevenLabs API Key

1. Visit [ElevenLabs](https://elevenlabs.io/)
2. Sign up for an account
3. Go to your profile settings
4. Copy your API key
5. Paste it into the AI Settings page

## Features

### Audio Player Component

The audio player includes:

- **Play/Pause Controls**: Start and stop audio playback
- **Volume Control**: Adjust audio volume with slider
- **Mute Toggle**: Quickly mute/unmute audio
- **Progress Bar**: Shows playback progress and allows seeking
- **Download Option**: Download the generated audio file
- **Time Display**: Shows current time and total duration

### Text-to-Speech API

The `/api/text-to-speech` endpoint provides:

- **POST**: Generate audio from text
  - Parameters: `text`, `voice_id`, `model_id`
  - Returns: Base64-encoded audio data
- **GET**: Fetch available voices
  - Returns: List of available ElevenLabs voices

## Usage

### Generating Audio

1. Ask a question to the AI
2. Wait for the AI response to appear
3. In the audio player section above the response, click "Generate Audio"
4. The system will convert the AI response to speech using ElevenLabs
5. Use the audio controls to play, pause, adjust volume, etc.

### Voice Selection

Currently, the system uses the default ElevenLabs voice (`21m00Tcm4TlvDq8ikWAM`). Future updates will allow voice selection from available ElevenLabs voices.

## Technical Details

### API Endpoint

```typescript
POST /api/text-to-speech
{
  "text": "Text to convert to speech",
  "voice_id": "21m00Tcm4TlvDq8ikWAM", // Optional, defaults to default voice
  "model_id": "eleven_monolingual_v1" // Optional, defaults to monolingual model
}
```

### Response Format

```typescript
{
  "success": true,
  "audio": "data:audio/mpeg;base64,<base64-encoded-audio>",
  "text": "Original text",
  "voice_id": "21m00Tcm4TlvDq8ikWAM",
  "model_id": "eleven_monolingual_v1"
}
```

### Error Handling

The system handles various error scenarios:

- **Missing API Key**: Prompts user to configure ElevenLabs API key
- **Invalid API Key**: Shows authentication error
- **Text Too Long**: Limits text to 5000 characters
- **Network Errors**: Shows appropriate error messages
- **API Rate Limits**: Displays rate limit errors

## Security

- API keys are stored encrypted in the database
- Keys are associated with user accounts
- No API keys are exposed in client-side code
- All API calls are made server-side

## Limitations

- Text length is limited to 5000 characters
- Requires active ElevenLabs subscription
- Audio generation may take a few seconds
- Internet connection required for API calls

## Future Enhancements

- Voice selection dropdown
- Custom voice settings (stability, similarity boost)
- Batch audio generation
- Audio caching for repeated text
- Multiple language support
- Voice cloning integration

## Troubleshooting

### Common Issues

1. **"ElevenLabs API key not found"**
   - Solution: Configure your API key in AI Settings

2. **"Text too long"**
   - Solution: Reduce text length to under 5000 characters

3. **"Failed to generate audio"**
   - Solution: Check your internet connection and API key validity

4. **Audio not playing**
   - Solution: Check browser audio permissions and volume settings

### Support

For technical support or feature requests, please contact the development team or create an issue in the project repository.
