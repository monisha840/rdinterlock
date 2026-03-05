import prisma from '../../config/database';

export class SystemSettingsService {
    /**
     * Get all system settings as a key-value object
     */
    async getAllSettings() {
        const settings = await prisma.systemSetting.findMany();
        return settings.reduce((acc: any, s) => {
            acc[s.key] = s.value;
            return acc;
        }, {});
    }

    /**
     * Update multiple settings at once
     */
    async updateSettings(settings: Record<string, string>) {
        const results = await prisma.$transaction(
            Object.entries(settings).map(([key, value]) =>
                prisma.systemSetting.upsert({
                    where: { key },
                    update: { value },
                    create: { key, value },
                })
            )
        );
        return results;
    }

    /**
     * Get a specific setting by key
     */
    async getSetting(key: string, defaultValue: string = '') {
        const setting = await prisma.systemSetting.findUnique({
            where: { key },
        });
        return setting ? setting.value : defaultValue;
    }
}
