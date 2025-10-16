export type AuthStackParamList = {
    Login: undefined;
    Register: undefined;
};

export type RootStackParamList = {
    Main: undefined;
    Event: { eventId: string; eventName: string };
}