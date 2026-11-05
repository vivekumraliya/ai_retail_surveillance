// Web Audio API procedural sound generator for realistic CCTV and security command console sounds

class SurveillanceAudio {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private alarmOscillator: OscillatorNode | null = null;
  private alarmGain: GainNode | null = null;
  private isAlarmRunning: boolean = false;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted && this.isAlarmRunning) {
      this.stopAlarm();
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  // Camera switch click / beep
  public playCameraSwitch() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(700, this.ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch {
      // Audio autoplay might be blocked before first interaction
    }
  }

  // Low subtle CCTV radio blip
  public playTelemetryChirp() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(2200, this.ctx.currentTime);
      osc.frequency.setValueAtTime(2600, this.ctx.currentTime + 0.03);

      gain.gain.setValueAtTime(0.03, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.06);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.06);
    } catch {
      // ignore
    }
  }

  // Security Gate theft alarm siren (two-tone warble)
  public startAlarm() {
    if (this.isMuted || this.isAlarmRunning) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      
      const now = this.ctx.currentTime;
      // Oscillate frequency between 800Hz and 1250Hz every 0.25s
      const lfo = this.ctx.createOscillator();
      lfo.frequency.setValueAtTime(3.5, now);
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(350, now);

      osc.frequency.setValueAtTime(950, now);
      lfo.connect(osc.frequency);

      gain.gain.setValueAtTime(0.12, now);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      lfo.start(now);
      osc.start(now);

      this.alarmOscillator = osc;
      this.alarmGain = gain;
      this.isAlarmRunning = true;
    } catch {
      // ignore
    }
  }

  public stopAlarm() {
    if (!this.isAlarmRunning) return;
    try {
      if (this.alarmGain && this.ctx) {
        this.alarmGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.15);
      }
      setTimeout(() => {
        if (this.alarmOscillator) {
          try {
            this.alarmOscillator.stop();
            this.alarmOscillator.disconnect();
          } catch {}
          this.alarmOscillator = null;
        }
        this.alarmGain = null;
        this.isAlarmRunning = false;
      }, 160);
    } catch {
      this.isAlarmRunning = false;
    }
  }
}

export const surveillanceAudio = new SurveillanceAudio();
