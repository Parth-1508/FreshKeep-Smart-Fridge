import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// ── THE FOREGROUND FIX: Keeps alerts visible while app is open ──
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function useNotifications() {
  const scheduleExpiryAlert = async (item) => {
    try {
      // 1. Ensure the Android Channel exists so it doesn't reject our alerts!
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('expiry-alerts', {
          name: 'Expiry Alerts',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#5a8f6b', // Matches your app's green theme
        });
      }

      // 2. Check permissions
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') return; 

      const expiryDate = new Date(item.expiryDate);
      const now = new Date();

      // ── THE GOLDILOCKS STRATEGY (4 Smart Alerts) ──
      const alerts = [
        {
          label: '3 Days Before',
          daysToSubtract: 3,
          hour: 10, 
          title: `📅 Heads up: ${item.name}`,
          body: `Your ${item.emoji} expires in 3 days. Perfect time to plan a meal!`,
        },
        {
          label: '1 Day Before',
          daysToSubtract: 1,
          hour: 16, 
          title: `⚠️ Tomorrow: ${item.name} expires`,
          body: `Don't forget to use your ${item.emoji} ${item.name} tomorrow!`,
        },
        {
          label: 'Day of Expiry',
          daysToSubtract: 0,
          hour: 9,  
          title: `🚨 URGENT: ${item.name} expires TODAY!`,
          body: `Last chance to use or freeze your ${item.emoji} ${item.name}.`,
        },
        {
          label: 'Officially Expired',
          daysToSubtract: -1, 
          hour: 10, 
          title: `☠️ RIP: ${item.name} has expired`,
          body: `Your ${item.emoji} is no longer good. Please toss it and swipe to remove it from your kitchen!`,
        }
      ];

      // Loop through and schedule the alerts
      for (const alert of alerts) {
        // Calculate the exact date and time
        const triggerDate = new Date(expiryDate);
        triggerDate.setDate(triggerDate.getDate() - alert.daysToSubtract);
        triggerDate.setHours(alert.hour, 0, 0, 0);

        // Only schedule if this specific time is actually in the future!
        if (triggerDate > now) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: alert.title,
              body: alert.body,
              sound: true,
              color: '#5a8f6b', // Tints the small Android status bar icon green
            },
            trigger: {
              type: 'date',                 // <-- FIX 1: Explicitly tell Expo it's a date
              date: triggerDate, 
              channelId: 'expiry-alerts',   // <-- FIX 2: Give Android the channel it requires
            },
          });
          
          console.log(`Scheduled: ${item.name} - ${alert.label} for ${triggerDate.toLocaleString()}`);
        }
      }

    } catch (error) {
      console.error("Error scheduling smart notifications:", error);
    }
  };

  return { scheduleExpiryAlert };
}