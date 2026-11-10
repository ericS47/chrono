"""Génère les annonces vocales enregistrées de Pulse (voix française Piper « siwis »).

Une seule piste MP3 (public/voix-fr.mp3) avec toutes les annonces séparées par du
silence, et son index (src/audio/voix-fr.json : clé → [début, durée] en secondes).
Les clés suivent la même normalisation que src/audio/voiceClips.ts (normKey).

Usage : python generer.py <modèle .onnx> <noms d'exercices .json> <dossier du dépôt>
Nécessite le paquet piper-tts et ffmpeg.
"""
import json, re, subprocess, sys, tempfile, wave
from pathlib import Path

import numpy as np
from piper import PiperVoice

FIXED = {
    'préparation': 'Préparation.', 'go': 'Go !', 'effort': 'Effort.', 'repos': 'Repos.',
    'repos entre séries': 'Repos entre séries.', 'récup': 'Récup.', 'récupération': 'Récupération.',
    'on change': 'On change !', 'mi-temps': 'Mi-temps.', "plus qu'une minute": 'Plus qu’une minute.',
    '30 secondes': 'Trente secondes.', '10 secondes': 'Dix secondes.', 'séance terminée': 'Séance terminée !',
    'tour': 'Tour', 'série': 'Série', 'sur': 'sur', 'minute': 'Minute', 'for time': 'For time.',
    'chrono': 'Chrono.', 'minuteur': 'Minuteur.', 'course': 'Course.',
}
NUMBERS = range(1, 61)
GAP = 0.3  # silence entre deux annonces (s)


def norm(t: str) -> str:
    t = t.replace('’', "'").lower()
    t = re.sub(r'\s*\([^)]*\)', '', t)
    return re.sub(r'\s+', ' ', t).strip().rstrip('.!?')


def main(model: str, labels_json: str, repo: str) -> None:
    voice = PiperVoice.load(model)
    rate = voice.config.sample_rate
    clips = dict(FIXED)
    for n in NUMBERS:
        clips[str(n)] = f'{n}.'
    for label in json.load(open(labels_json)):
        k = norm(label)
        clips.setdefault(k, re.sub(r'\s*\([^)]*\)', '', label).strip() + '.')
    out, index, pos = [], {}, 0.0
    for key, text in clips.items():
        with tempfile.NamedTemporaryFile(suffix='.wav') as f:
            with wave.open(f.name, 'wb') as w:
                voice.synthesize_wav(text, w)
            with wave.open(f.name, 'rb') as w:
                a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
        # Silence retiré au début et à la fin : les mots s'enchaînent sans trou.
        loud = np.flatnonzero(np.abs(a) > 0.02)
        a = a[max(0, loud[0] - int(0.02 * rate)): loud[-1] + int(0.05 * rate)] if loud.size else a
        index[key] = [round(pos, 4), round(len(a) / rate, 4)]
        out += [a, np.zeros(int(GAP * rate), np.float32)]
        pos += len(a) / rate + GAP
    pcm = (np.clip(np.concatenate(out), -1, 1) * 32767).astype(np.int16)
    with tempfile.NamedTemporaryFile(suffix='.wav') as f:
        with wave.open(f.name, 'wb') as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate); w.writeframes(pcm.tobytes())
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', f.name, '-ac', '1', '-b:a', '48k',
                        str(Path(repo) / 'public' / 'voix-fr.mp3')], check=True)
    json.dump(index, open(Path(repo) / 'src' / 'audio' / 'voix-fr.json', 'w'), ensure_ascii=False, indent=0)
    print(f'{len(index)} annonces, {pos:.0f} s')


if __name__ == '__main__':
    main(*sys.argv[1:4])
