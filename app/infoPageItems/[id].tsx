import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useLocalSearchParams } from 'expo-router';
import { useGlobalSearchParams } from 'expo-router';
import { TouchableOpacity, ImageBackground, ActivityIndicator, ScrollView } from 'react-native';
import { useEffect, useState } from 'react';
import { styles } from '@/styles/auth.styles';
import { useSQLiteContext } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { useUser } from '@/context/UserContext';


export default function medInfoPage() {
    const router = useRouter();
    const { id } = useGlobalSearchParams();
    const idNum = Number(id);// Get the medication ID from the route parameters
    console.log('Medication ID:', id); // Log the ID for debugging

    const { user } = useUser();
    const db = useSQLiteContext();
    const drizzleDb = drizzle(db, { schema });
    const [medData, setMedData] = useState<any>(null);
    const [medName, setMedName] = useState<any>(null);
    const [sideEffectsList, setSideEffectsList] = useState<any>(null);
    const [dosageForm, setDosageForm] = useState<any>(null);
    const [loading, setLoading] = useState(true);
  
    useEffect(() => {
      async function fetchMed() {
        const userMed = await drizzleDb
          .select()
          .from(schema.userMedications)
          .where(
            and(
              eq(schema.userMedications.userId, user.id),
              eq(schema.userMedications.medicationId, idNum)
            )
          )
          .get();
        console.log('Fetched medication data:', userMed); // Log the fetched data for debugging
        setMedData(userMed);

        const dosageFormType = await drizzleDb
          .select()
          .from(schema.dosageOptions)
          .where(eq(schema.dosageOptions.id, userMed.dosageFormId))
          .get();
        console.log('Fetched dosage form:', dosageFormType); // Log the fetched data for debugging
        setDosageForm(dosageFormType);

        const medicationName = await drizzleDb
          .select()
          .from(schema.medications)
          .where(eq(schema.medications.id, idNum))
          .get();
        console.log('Fetched medication name:', medicationName); // Log the fetched data for debugging
        setMedName(medicationName);

        const sideEffectsData = await drizzleDb
          .select()
          .from(schema.medicationSideEffects)
          .leftJoin(schema.sideEffects, eq(schema.medicationSideEffects.sideEffectId, schema.sideEffects.id))
          .where(eq(schema.medicationSideEffects.medicationId, idNum))
          .all();
        const simplified = sideEffectsData.map((item) => item.side_effects);
        setSideEffectsList(simplified);
        console.log('Fetched side effects:', simplified); // Log the fetched data for debugging


        setLoading(false);
      }
  
      fetchMed();
    }, [idNum]);
  
    const returnToInfoPage = () => {
      router.back();
    };
  
    if (loading || !medData) {
      return <ActivityIndicator size="large" />;
    }
  
  
    return (
      <View style={styles.container}>
        <Text style={localStyles.title}> Medication Information</Text>
          <View style={{width: 330, marginTop: 50, height: 480, }}>
            <ImageBackground source={require('../../assets/images/Containers/infoRowCont.png')} style={localStyles.smallContainer}>
              <Text style={{ fontSize: 15, flexWrap: 'wrap', flexDirection: 'row'}}>
                <Text style={{ fontWeight: 'bold' }}>Brand: </Text>
                <Text  style={{ flexShrink: 1 }}>{medName.brand}</Text>
              </Text>
              <Text style={{ fontSize: 15, flexWrap: 'wrap' , flexDirection: 'row' }}>
                <Text style={{ fontWeight: 'bold' }}>Generic: </Text>
                <Text  style={{ flexShrink: 1 }}>{medName.generic}</Text>
              </Text>
              <Text style={{ fontSize: 15, flexWrap: 'wrap' , flexDirection: 'row' }}>
                <Text style={{ fontWeight: 'bold' }}>Form: </Text>
                <Text  style={{ flexShrink: 1 }}>{dosageForm.form}</Text>
              </Text>
              <Text style={{ fontSize: 15, flexWrap: 'wrap', flexDirection: 'row' }}>
                <Text style={{ fontWeight: 'bold' }}>Dosage: </Text>
                <Text  style={{ flexShrink: 1 }}>{medData.dosageAmount}</Text>
              </Text>
            </ImageBackground>
              <View style={{marginVertical: 6, gap: 6,  height: 138}}>
                <View style={{flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center',  height: 66}}>
                  <ImageBackground source={require('../../assets/images/Containers/morningCont.png')} style={{width: 162, height: 66, margin: 0, paddingVertical: 12, paddingHorizontal: 16}}>
                    <Text style={{ fontWeight: 'bold' }}>  Morning: </Text>
                    <Text>                {medData.morning}</Text>
                  </ImageBackground>
                  <ImageBackground source={require('../../assets/images/Containers/afternoonCont.png')} style={{width: 162, height: 66, margin: 0, paddingTop: 12, paddingLeft: 54}}>
                    <Text style={{ fontWeight: 'bold' }}>   Afternoon: </Text>
                    <Text>{medData.afternoon}</Text>
                  </ImageBackground>
                </View>
                <View style={{flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center'}}>
                  <ImageBackground source={require('../../assets/images/Containers/eveningCont.png')} style={{width: 162, height: 66, margin: 0, paddingTop: 12, paddingHorizontal: 16}}>
                    <Text style={{ fontWeight: 'bold' }}>   Evening: </Text>
                    <Text> {medData.evening}</Text>
                  </ImageBackground>
                  <ImageBackground source={require('../../assets/images/Containers/bedtimeCont.png')} style={{width: 162, height: 66, margin: 0, paddingTop: 12, paddingHorizontal: 16}}>
                    <Text style={{ fontWeight: 'bold',  }}>  Bedtime: </Text>
                    <Text>      {medData.bedtime}</Text>
                  </ImageBackground>
                </View>
              </View>
            <ImageBackground source={require('../../assets/images/Containers/infoBottomCont.png')} style={localStyles.container}>
              <Text style={{ fontSize: 15, fontWeight: 'bold' }}>Side Effects:</Text>
              <ScrollView
                style={{
                  marginBottom: 12,
                  marginTop: 4,
                  borderColor: '#FFF',
                  borderTopColor: '#CCC',
                  borderBottomColor: '#CCC',
                  backgroundColor: '#FFF',
                  borderWidth: 1,
                  width: 290,
                  padding: 4,
                }}
                persistentScrollbar={true}
              >
                {sideEffectsList?.map((item) => (
                  <Text key={item.id} style={{borderBottomWidth: 1, borderColor: '#EEE'}}>• {item.description}</Text>
                ))}
              </ScrollView>
            </ImageBackground>
            <TouchableOpacity onPress={returnToInfoPage}>
              <Text style={localStyles.button}>Back</Text>
            </TouchableOpacity>
          </View>
      </View>
    );
  }

const localStyles = StyleSheet.create({
  title: {
    fontSize: 40,
    fontFamily: 'pixelRegular',
    color: 'white',
    paddingBottom: 20,
    position: 'absolute',
    top: 75,
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center'
  },
  smallContainer: {
    width: 330, 
    height: 114, 
    alignSelf: 'center',
    justifyContent: 'flex-start',
    flexDirection: 'column',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  container: {
      width: 330, 
      height: 186, 
      paddingVertical: 15,
      paddingHorizontal: 20,
  },
  editButton: {
      width: 72, 
      height: 72, 
 
      top: 55, 
      left: 110
  },
  section: {
    flexDirection: 'column',
    alignItems: 'flex-start',

  },
  sectionText: {
    marginLeft: 10,
    fontSize: 20,
    color: 'black',
    //fontFamily: 'pixelRegular',
    flexWrap: 'wrap',
    width: 300,
  },
  checkbox: {
    alignSelf: 'center',
  },
  button: {
    width: '40%',
    padding: 10,
    fontFamily: 'pixelRegular',
    fontSize: 20,
    color: '#fff',
    borderColor: '#474387',
    backgroundColor: '#7f7bbe',
    borderWidth: 6,
    alignSelf: 'center',
    textAlign: 'center',
    marginBottom: -150,
    marginTop: 10,
  },
  page: {
    backgroundColor: "#7CB5DD",
    marginBottom: -30,
  }
});