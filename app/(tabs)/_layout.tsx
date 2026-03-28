import { Tabs } from 'expo-router';
import { ImageBackground, View, Text } from 'react-native';
import  FontAwesome  from '@expo/vector-icons/FontAwesome';
import { UserProvider } from '@/context/UserContext';
import { Slot } from 'expo-router';

export default function TabLayout() {
    return (
        
        <Tabs screenOptions={{ 
            tabBarActiveTintColor: 'blue',
            tabBarStyle: { 
                position: 'absolute',
                
                paddingTop: 10,
                backgroundColor: "#7CB5DD",
            },
            headerShown: false,
        }}>
            <Tabs.Screen
                name="infoPage"
                options={{
                    title: '',
                    tabBarIcon: ({ focused }) => (
                        <ImageBackground
                            source={require('../../assets/images/Tabs/infoTab.png')}
                            style={{ 
                                width: 84, 
                                height: 150, 
                                justifyContent: 'center', 
                                alignItems: 'center',
                                marginTop: 45,
                                
                                transform: [{ translateY: focused ? 0 : 18 }] 
                                }}>
                        </ImageBackground>
                    ),
                    tabBarStyle: {
                        position: 'absolute',
                        height: 90,
                        paddingTop: 0,
                    },

                }}
            />
            <Tabs.Screen
                name="gamesPage"
                options={{
                    title: '',
                    tabBarIcon: ({ focused }) => (
                        <ImageBackground
                            source={require('../../assets/images/Tabs/gameTab.png')}
                            style={{ 
                                width: 84, 
                                height: 150, 
                                justifyContent: 'center', 
                                alignItems: 'center',
                                marginTop: 45,
                                
                                transform: [{ translateY: focused ? 0 : 18 }] 
                                }}>
                        </ImageBackground>
                    ),
                    tabBarStyle: {
                        position: 'absolute',
                        height: 90,
                        paddingTop: 0,
                    },

                }}
            />
            <Tabs.Screen
                name="index"
                options={{
                    title: '',
                    tabBarIcon: ({ focused }) => (
                        <ImageBackground
                            source={require('../../assets/images/Tabs/homeTab.png')}
                            style={{ 
                                width: 84, 
                                height: 150, 
                                justifyContent: 'center', 
                                alignItems: 'center',
                                marginTop: 45,
                                
                                transform: [{ translateY: focused ? 0 : 18 }] 
                                }}>
                        </ImageBackground>
                    ),
                    tabBarStyle: {
                        position: 'absolute',
                        height: 90,
                        paddingTop: 0,
                    },

                }}
            />
            <Tabs.Screen
                name="petPage"
                options={{
                    title: '',
                    tabBarIcon: ({ focused }) => (
                        <ImageBackground
                            source={require('../../assets/images/Tabs/petTab.png')}
                            style={{ 
                                width: 84, 
                                height: 150, 
                                justifyContent: 'center', 
                                alignItems: 'center',
                                marginTop: 45,
                                
                                transform: [{ translateY: focused ? 0 : 18 }] 
                                }}>
                        </ImageBackground>
                    ),
                    tabBarStyle: {
                        position: 'absolute',
                        height: 90,
                        paddingTop: 0,
                    },

                }}
            />
            <Tabs.Screen
                name="settingsPage"
                options={{
                    title: '',
                    tabBarIcon: ({ focused }) => (
                        <ImageBackground
                            source={require('../../assets/images/Tabs/settingsTab.png')}
                            style={{ 
                                width: 84, 
                                height: 150, 
                                justifyContent: 'center', 
                                alignItems: 'center',
                                marginTop: 45,
                                
                                transform: [{ translateY: focused ? 0 : 18 }] 
                                }}>
                        </ImageBackground>
                    ),
                    tabBarStyle: {
                        position: 'absolute',
                        height: 90,
                        paddingTop: 0,
                    },

                }}
            />
            <Tabs.Screen
                name="checkIns"
                options={{
                    title: '',
                    tabBarIcon: ({ focused }) => (
                        <ImageBackground
                            source={require('../../assets/images/Tabs/settingsTab.png')}
                            style={{ 
                                width: 84, 
                                height: 150, 
                                justifyContent: 'center', 
                                alignItems: 'center',
                                marginTop: 45,
                                transform: [{ translateY: focused ? 0 : 18 }] 
                            }}>
                        </ImageBackground>
                    ),
                    tabBarStyle: {
                        position: 'absolute',
                        height: 90,
                        paddingTop: 0,
                    },
                }}
            />
        </Tabs>
    );
}