import { useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { Platform, Text, View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import { useTournament } from '@/features/tournament'
import { API_BASE } from '@/lib/api'
import { dateFr } from '@/lib/format'
import { Button, Card, Field, font, radius, Row, Screen, space, T, useTheme } from '@/ui'

/** Affiche à imprimer et coller dans la salle : le QR code mène droit au suivi du tournoi. */
export default function Poster() {
  const t = useTheme()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { snap } = useTournament(id)
  const origin = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : API_BASE
  const [base, setBase] = useState(origin)
  useEffect(() => {
    // à l'impression, on ne garde que l'affiche
    if (Platform.OS !== 'web') return
    const style = document.createElement('style')
    style.textContent = '@media print { [data-testid="noprint"] { display: none !important } body { background: #fff !important } }'
    document.head.appendChild(style)
    return () => { style.remove() }
  }, [])
  if (!snap) return null
  const url = `${base.replace(/\/$/, '')}/t/${snap.tournament.slug}/moi`
  return (
    <Screen maxWidth={760}>
      <View testID="noprint">
      <Card style={{ gap: space.md }}>
        <T color={t.ink2}>Imprimez cette affiche et collez-la à l'entrée et près de la table de marque. En scannant le code, chacun choisit « je joue » ou « je suis un joueur » et reçoit ses horaires.</T>
        <Field label="Adresse du site" value={base} onChangeText={setBase} autoCapitalize="none" hint="En mode salle sans Internet, mettez ici l'adresse du serveur sur le réseau Wi-Fi local, par exemple http://192.168.1.10:4000." />
        <Row wrap>
          {Platform.OS === 'web' ? <Button label="Imprimer" icon="print-outline" onPress={() => window.print()} /> : null}
        </Row>
      </Card>
      </View>
      <View testID="poster" style={{ backgroundColor: '#FFFFFF', borderRadius: radius.lg, padding: space.xxl, alignItems: 'center', gap: space.lg, borderWidth: 1, borderColor: t.line }}>
        <Text style={{ fontFamily: font.display, fontSize: 22, letterSpacing: 3, color: '#0B1437' }}>PLUME</Text>
        <Text style={{ fontFamily: font.display, fontSize: 46, lineHeight: 48, color: '#0B1437', textAlign: 'center' }}>{snap.tournament.name}</Text>
        <Text style={{ fontSize: 17, color: '#454F72', textAlign: 'center' }}>{dateFr(snap.tournament.startDate)}{snap.tournament.location ? ` · ${snap.tournament.location}` : ''}</Text>
        <View style={{ padding: 16, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 6, borderColor: '#0B1437' }}>
          <QRCode value={url} size={260} color="#0B1437" backgroundColor="#FFFFFF" />
        </View>
        <View style={{ backgroundColor: '#C8F03C', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 22 }}>
          <Text style={{ fontFamily: font.display, fontSize: 30, lineHeight: 32, color: '#182300', textAlign: 'center' }}>Scannez pour savoir quand vous jouez</Text>
        </View>
        <Text style={{ fontSize: 16, color: '#454F72', textAlign: 'center', maxWidth: 460 }}>Heure estimée de votre match, terrain, résultats en direct et alerte à l'appel. Sans application à installer, sans compte.</Text>
        <Text selectable style={{ fontSize: 14, color: '#77819E', textAlign: 'center' }}>{url}</Text>
      </View>
    </Screen>
  )
}
