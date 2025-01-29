import axios from 'axios';

export interface SMSMessage {
  to: string;
  message: string;
}

export interface TTSMessage {
  to: string;
  message: string;
  voice?: 'female' | 'male';
}

export class ClickSendClient {
  private client;

  constructor(username: string, apiKey: string) {
    this.client = axios.create({
      baseURL: 'https://rest.clicksend.com/v3',
      auth: {
        username,
        password: apiKey
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async sendSMS(params: SMSMessage) {
    const payload = {
      messages: [
        {
          source: 'mcp',
          body: params.message,
          to: params.to
        }
      ]
    };

    try {
      const response = await this.client.post('/sms/send', payload);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`ClickSend API Error: ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  }

  async makeTTSCall(params: TTSMessage) {
    const payload = {
      messages: [
        {
          to: params.to,
          body: params.message,
          voice: params.voice || 'female',
          require_input: 0,
          machine_detection: 0
        }
      ]
    };

    try {
      const response = await this.client.post('/voice/send', payload);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`ClickSend API Error: ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  }
}
