import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {LayoutDashboard, Package, TrendingUp, Bell, Settings} from 'lucide-react-native';
import { CommonActions, useNavigation } from '@react-navigation/native';
import DashboardAdmin from './dashboard-ad';
import Inventario from './inventario';
import Ventas from './ventas';
import Alertas from './alertas';
import Configuracion from './config';
import { getMe } from '../../services/auth';
import { clearToken, getToken, hydrateToken } from '../../services/storage';

const Tab = createBottomTabNavigator();

export function AdminTabs() {
    const navigation = useNavigation();
    const [isCheckingRole, setIsCheckingRole] = useState(true);

    const goToLogin = () => {
        navigation.dispatch(
            CommonActions.reset({
                index: 0,
                routes: [{ name: 'InicioSesion' as never }],
            }),
        );
    };

    useEffect(() => {
        const validateRole = async () => {
            try {
                let token = getToken();

                if (!token) {
                    token = await hydrateToken();
                }

                if (!token) {
                    await clearToken();
                    goToLogin();
                    return;
                }

                const me = await getMe(token);
                const roleRaw = typeof me.rol === 'string' ? me.rol : (me.rol?.nombre ?? '');
                const normalized = roleRaw
                    .toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '');

                if (!normalized.includes('admin')) {
                    await clearToken();
                    goToLogin();
                }
            } catch {
                await clearToken();
                goToLogin();
            } finally {
                setIsCheckingRole(false);
            }
        };

        validateRole().catch(() => {
            setIsCheckingRole(false);
        });
    }, []);

    const loadingView = useMemo(() => (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' }}>
            <ActivityIndicator size="large" color="#1C273F" />
        </View>
    ), []);

    if (isCheckingRole) {
        return loadingView;
    }

    return (
        <Tab.Navigator screenOptions={{
            tabBarActiveTintColor: '#1C273F',
            tabBarStyle: {backgroundColor: '#fff'},
            headerShown: false
        }}>
            <Tab.Screen name="DashboardTab" component={DashboardAdmin}
                        options={{
                            tabBarIcon: ({color}) => <LayoutDashboard color={color} size={24}/>,
                            tabBarLabel: 'Dashboard'
                        }}/>
            <Tab.Screen name="InventarioTab" component={Inventario}
                        options={{
                            tabBarIcon: ({color}) => <Package color={color} size={24}/>,
                            tabBarLabel: 'Inventario'
                        }}/>
            <Tab.Screen name="VentasTab" component={Ventas}
                        options={{
                            tabBarIcon: ({color}) => <TrendingUp color={color} size={24}/>,
                            tabBarLabel: 'Ventas'
                        }}/>
            <Tab.Screen name="AlertasTab" component={Alertas}
                        options={{
                            tabBarIcon: ({color}) => <Bell color={color} size={24}/>,
                            tabBarLabel: 'Alertas'
                        }}/>
            <Tab.Screen name="ConfigTab" component={Configuracion}
                        options={{
                            tabBarIcon: ({color}) => <Settings color={color} size={24}/>,
                            tabBarLabel: 'Config'
                        }}/>
        </Tab.Navigator>
    );
}