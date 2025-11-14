// Type declarations for ElevenLabs ConvAI Widget
declare namespace JSX {
  interface IntrinsicElements {
    'elevenlabs-convai': React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & {
        'agent-id'?: string
        'avatar-image-url'?: string
        'action-text'?: string
        'start-call-text'?: string
        'end-call-text'?: string
      },
      HTMLElement
    >
  }
}

