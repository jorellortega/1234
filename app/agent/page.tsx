"use client"

import { useEffect, useState, useRef } from 'react'
import { Radio, Mic, Volume2, Waves } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'

export default function AgentTestPage() {
  const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([])
  const [selectedMic, setSelectedMic] = useState<string>('')
  const [inputVolume, setInputVolume] = useState([100])
  const [isTestingMic, setIsTestingMic] = useState(false)
  const [audioLevels, setAudioLevels] = useState<number[]>(Array(20).fill(0))
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  // Load microphone devices
  useEffect(() => {
    const loadMicrophones = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true })
        const devices = await navigator.mediaDevices.enumerateDevices()
        const audioInputs = devices.filter(device => device.kind === 'audioinput')
        setMicrophones(audioInputs)
        if (audioInputs.length > 0 && !selectedMic) {
          setSelectedMic(audioInputs[0].deviceId)
        }
      } catch (error) {
        console.error('Error loading microphones:', error)
      }
    }
    loadMicrophones()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Audio visualization loop
  useEffect(() => {
    if (!isTestingMic || !analyserRef.current) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      return
    }

    const analyser = analyserRef.current
    const dataArray = new Uint8Array(analyser.frequencyBinCount)

    const updateAudioLevels = () => {
      analyser.getByteFrequencyData(dataArray)
      
      // Convert frequency data to visual bars (20 bars)
      const barCount = 20
      const samplesPerBar = Math.floor(dataArray.length / barCount)
      const levels: number[] = []
      
      for (let i = 0; i < barCount; i++) {
        let sum = 0
        for (let j = 0; j < samplesPerBar; j++) {
          sum += dataArray[i * samplesPerBar + j]
        }
        const avg = sum / samplesPerBar
        levels.push(Math.min(100, (avg / 255) * 100))
      }
      
      setAudioLevels(levels)
      animationFrameRef.current = requestAnimationFrame(updateAudioLevels)
    }

    animationFrameRef.current = requestAnimationFrame(updateAudioLevels)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [isTestingMic])

  // Test microphone
  const testMicrophone = async () => {
    if (isTestingMic) {
      // Stop testing
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
      setAudioLevels(Array(20).fill(0))
      setIsTestingMic(false)
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: selectedMic ? { exact: selectedMic } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      })
      streamRef.current = stream

      const audioContext = new AudioContext()
      audioContextRef.current = audioContext
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      analyserRef.current = analyser
      source.connect(analyser)

      setIsTestingMic(true)
    } catch (error) {
      console.error('Error testing microphone:', error)
      alert('Failed to access microphone. Please check permissions.')
    }
  }

  useEffect(() => {
    // Load the ElevenLabs widget script
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/@elevenlabs/convai-widget-embed'
    script.async = true
    script.type = 'text/javascript'
    document.body.appendChild(script)

    return () => {
      // Cleanup: remove script on unmount
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
      // Cleanup audio
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header Section */}
      <section className="container mx-auto px-4 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center gap-3">
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              INFINITO
            </h1>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/20 border border-green-500/50">
              <Radio className="h-3 w-3 text-green-400 animate-pulse" />
              <span className="text-xs font-semibold text-green-400 uppercase tracking-wide">Live</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content with Side Panel */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* Widget Container */}
          <div className="aztec-panel backdrop-blur-md shadow-2xl rounded-2xl p-8 min-h-[600px] flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-blue-500/5 to-purple-500/5"></div>
            <div className="relative z-10 w-full">
              <elevenlabs-convai
                agent-id="agent_3601ka1snmgqezkb5tw782br1aeq"
              ></elevenlabs-convai>
            </div>
          </div>

          {/* Futuristic Side Panel - Microphone Settings */}
          <div className="aztec-panel backdrop-blur-md shadow-2xl rounded-2xl p-6 relative overflow-hidden border-cyan-500/30 shadow-cyan-500/20">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/10 via-blue-900/10 to-purple-900/10"></div>
            <div className="relative z-10 space-y-6">
              {/* Header */}
              <div className="flex items-center gap-3 pb-4 border-b border-cyan-500/30">
                <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/50">
                  <Mic className="h-5 w-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="font-bold text-lg bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                    Audio Control
                  </h3>
                  <p className="text-xs text-slate-400">Microphone Settings</p>
                </div>
              </div>

              {/* Microphone Selection */}
              <div className="space-y-3">
                <Label htmlFor="mic-select" className="text-cyan-300 text-sm font-semibold flex items-center gap-2">
                  <Waves className="h-4 w-4" />
                  Input Device
                </Label>
                <Select value={selectedMic} onValueChange={setSelectedMic}>
                  <SelectTrigger 
                    id="mic-select" 
                    className="bg-slate-900/80 border-cyan-500/30 text-white hover:border-cyan-500/50 focus:border-cyan-500/50 focus:ring-cyan-500/20"
                  >
                    <SelectValue placeholder="Select microphone" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-cyan-500/30">
                    {microphones.map((mic) => (
                      <SelectItem
                        key={mic.deviceId}
                        value={mic.deviceId}
                        className="text-white focus:bg-cyan-500/20 focus:text-cyan-300"
                      >
                        {mic.label || `Microphone ${mic.deviceId.slice(0, 8)}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Input Volume */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-cyan-300 text-sm font-semibold flex items-center gap-2">
                    <Volume2 className="h-4 w-4" />
                    Input Gain
                  </Label>
                  <span className="text-sm font-mono text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded border border-cyan-500/30">
                    {inputVolume[0]}%
                  </span>
                </div>
                <div className="relative">
                  <Slider
                    value={inputVolume}
                    onValueChange={setInputVolume}
                    max={100}
                    min={0}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>0</span>
                    <span>50</span>
                    <span>100</span>
                  </div>
                </div>
              </div>

              {/* Visual Audio Indicator */}
              {isTestingMic && (
                <div className="space-y-2">
                  <Label className="text-cyan-300 text-sm font-semibold">Audio Level</Label>
                  <div className="h-20 bg-slate-900/50 rounded-lg border border-cyan-500/30 p-3 flex items-end gap-1">
                    {audioLevels.map((level, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-gradient-to-t from-cyan-500 to-blue-500 rounded-sm transition-all duration-75"
                        style={{
                          height: `${Math.max(5, level)}%`,
                          opacity: level > 10 ? 1 : 0.5,
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Test Microphone Button */}
              <Button
                onClick={testMicrophone}
                className={`w-full font-semibold transition-all duration-300 ${
                  isTestingMic
                    ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white border-red-500/50 shadow-lg shadow-red-500/20'
                    : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border-cyan-500/50 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30'
                }`}
                size="lg"
              >
                <Mic className={`h-4 w-4 mr-2 ${isTestingMic ? 'animate-pulse' : ''}`} />
                {isTestingMic ? 'Stop Test' : 'Test Microphone'}
              </Button>

              {/* Status Indicator */}
              <div className="pt-4 border-t border-cyan-500/30">
                <div className="flex items-center gap-2 text-xs">
                  <div className={`h-2 w-2 rounded-full ${isTestingMic ? 'bg-green-400 animate-pulse' : 'bg-slate-500'}`}></div>
                  <span className="text-slate-400">
                    {isTestingMic ? 'Microphone Active' : 'Standby'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

