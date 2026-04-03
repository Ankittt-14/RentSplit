import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING, SHADOWS } from '../../utils/theme';

const { width } = Dimensions.get('window');

/**
 * CustomAlert - A premium replacement for Alert.alert
 * Props:
 * - visible: boolean
 * - title: string
 * - message: string
 * - type: 'success' | 'error' | 'info' | 'warning'
 * - onConfirm: function
 * - confirmText: string (default: 'OK')
 */
export default function CustomAlert({ visible, title, message, type = 'success', onConfirm, onCancel, confirmText = 'OK', cancelText = 'Cancel' }) {
    const [fadeAnim] = React.useState(new Animated.Value(0));
    const [scaleAnim] = React.useState(new Animated.Value(0.8));

    React.useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
                Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true })
            ]).start();
        } else {
            fadeAnim.setValue(0);
            scaleAnim.setValue(0.8);
        }
    }, [visible]);

    const getIcon = () => {
        switch (type) {
            case 'success': return 'check-circle';
            case 'error': return 'error';
            case 'warning': return 'warning';
            case 'info': return 'info';
            default: return 'info';
        }
    };

    const getColors = () => {
        switch (type) {
            case 'success': return ['#006a50', '#004d3a'];
            case 'error': return ['#ba1a1a', '#93000a'];
            case 'warning': return ['#e3b01a', '#b78c00'];
            default: return [COLORS.primary, '#004d3a'];
        }
    };

    if (!visible) return null;

    return (
        <Modal transparent visible={visible} animationType="none">
            <View style={styles.overlay}>
                <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
                    <LinearGradient colors={getColors()} style={styles.iconContainer}>
                        <MaterialIcons name={getIcon()} size={40} color="#fff" />
                    </LinearGradient>
                    
                    <View style={styles.content}>
                        <Text style={styles.title}>{title}</Text>
                        <Text style={styles.message}>{message}</Text>
                        
                        <View style={styles.buttonContainer}>
                            {onCancel && (
                                <TouchableOpacity onPress={onCancel} style={[styles.button, styles.cancelButton]}>
                                    <Text style={styles.cancelButtonText}>{cancelText}</Text>
                                </TouchableOpacity>
                            )}
                            
                            <TouchableOpacity onPress={onConfirm} style={styles.button}>
                                <LinearGradient colors={getColors()} style={styles.gradientButton} start={{x:0, y:0}} end={{x:1, y:0}}>
                                    <Text style={styles.buttonText}>{confirmText}</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        width: width * 0.8,
        backgroundColor: '#fff',
        borderRadius: RADIUS.xl,
        alignItems: 'center',
        overflow: 'hidden',
        ...SHADOWS.card,
    },
    iconContainer: {
        width: '100%',
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        padding: SPACING.lg,
        alignItems: 'center',
        width: '100%',
    },
    title: {
        fontSize: 20,
        fontWeight: '900',
        color: COLORS.primary,
        marginBottom: SPACING.xs,
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    message: {
        fontSize: 14,
        color: COLORS.onSurfaceVariant,
        textAlign: 'center',
        marginBottom: SPACING.xl,
        lineHeight: 20,
        fontWeight: '500',
    },
    buttonContainer: {
        width: '100%',
        flexDirection: 'row',
        gap: SPACING.md,
    },
    button: {
        flex: 1,
        height: 48,
        borderRadius: RADIUS.md,
        overflow: 'hidden',
    },
    cancelButton: {
        backgroundColor: 'rgba(0,0,0,0.03)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 0,
    },
    cancelButtonText: {
        color: COLORS.onSurfaceVariant,
        fontSize: 15,
        fontWeight: '700',
    },
    gradientButton: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    }
});
