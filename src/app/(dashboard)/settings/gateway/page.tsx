'use client';

import { useEffect, useState } from 'react';

import { createClient } from '@/lib/supabase/client';



type GatewaySettings = {
  id?: string;
  sms_provider: string;
  api_username: string;
  api_key: string;
  sender_id: string;
  default_currency: string;
};



export default function GatewaySettingsPage() {

  const supabase = createClient();


  const [settings, setSettings] =
    useState<GatewaySettings>({
      sms_provider: 'africastalking',
      api_username: '',
      api_key: '',
      sender_id: '',
      default_currency: 'KES',
    });


  const [businessId, setBusinessId] =
    useState<string | null>(null);


  const [loading, setLoading] =
    useState(true);


  const [saving, setSaving] =
    useState(false);


  const [message, setMessage] =
    useState('');



  useEffect(() => {

    loadSettings();

  }, []);



  async function loadSettings() {

    try {

      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();



      if (!user) return;



      const {
        data: profile
      } = await supabase
        .from('users')
        .select('business_id')
        .eq(
          'id',
          user.id
        )
        .single();



      if (!profile?.business_id)
        return;



      setBusinessId(
        profile.business_id
      );



      const {
        data,
        error
      } = await supabase
        .from('business_settings')
        .select('*')
        .eq(
          'business_id',
          profile.business_id
        )
        .single();



      if (!error && data) {

        setSettings({

          id: data.id,

          sms_provider:
            data.sms_provider || 'africastalking',

          api_username:
            data.api_username || '',

          api_key:
            data.api_key || '',

          sender_id:
            data.sender_id || '',

          default_currency:
            data.default_currency || 'KES',

        });

      }


    } catch (error) {

      console.error(error);

    }
    finally {

      setLoading(false);

    }

  }



  async function saveSettings(
    e: React.FormEvent
  ) {

    e.preventDefault();


    if (!businessId)
      return;



    setSaving(true);
    setMessage('');



    const {
      error
    } = await supabase
      .from('business_settings')
      .upsert({

        business_id:
          businessId,

        sms_provider:
          settings.sms_provider,

        api_username:
          settings.api_username,

        api_key:
          settings.api_key,

        sender_id:
          settings.sender_id,

        default_currency:
          settings.default_currency,

      },
      {
        onConflict:
          'business_id'
      });



    if (error) {

      setMessage(
        error.message
      );

      setSaving(false);

      return;

    }



    setMessage(
      'Gateway settings saved successfully.'
    );


    setSaving(false);

  }



  if (loading) {

    return (

      <div className="p-6">

        Loading gateway settings...

      </div>

    );

  }



  return (

    <div className="max-w-2xl p-6">


      <div className="mb-6">

        <h1 className="text-2xl font-bold">
          SMS Gateway Settings
        </h1>

        <p className="text-sm text-gray-500">
          Configure KopaAlert notification provider
        </p>

      </div>



      {message && (

        <div className="
          mb-5
          rounded-md
          border
          bg-gray-50
          p-3
          text-sm
        ">

          {message}

        </div>

      )}



      <form
        onSubmit={saveSettings}
        className="
          space-y-5
          rounded-lg
          border
          bg-white
          p-6
          shadow-sm
        "
      >


        <div>

          <label className="block text-sm font-medium">
            SMS Provider
          </label>


          <select

            value={settings.sms_provider}

            onChange={(e) =>
              setSettings({
                ...settings,
                sms_provider:
                  e.target.value,
              })
            }

            className="mt-1 w-full rounded-md border px-3 py-2"

          >

            <option value="africastalking">
              Africa's Talking
            </option>


          </select>

        </div>



        <div>

          <label className="block text-sm font-medium">
            API Username
          </label>


          <input

            value={settings.api_username}

            onChange={(e) =>
              setSettings({
                ...settings,
                api_username:
                  e.target.value,
              })
            }

            className="mt-1 w-full rounded-md border px-3 py-2"

            placeholder="sandbox"

          />

        </div>



        <div>

          <label className="block text-sm font-medium">
            API Key
          </label>


          <input

            type="password"

            value={settings.api_key}

            onChange={(e) =>
              setSettings({
                ...settings,
                api_key:
                  e.target.value,
              })
            }

            className="mt-1 w-full rounded-md border px-3 py-2"

            placeholder="Africa's Talking API key"

          />

        </div>



        <div>

          <label className="block text-sm font-medium">
            Sender ID
          </label>


          <input

            value={settings.sender_id}

            onChange={(e) =>
              setSettings({
                ...settings,
                sender_id:
                  e.target.value,
              })
            }

            className="mt-1 w-full rounded-md border px-3 py-2"

            placeholder="KopaAlert"

          />

        </div>



        <div>

          <label className="block text-sm font-medium">
            Currency
          </label>


          <input

            value={settings.default_currency}

            onChange={(e) =>
              setSettings({
                ...settings,
                default_currency:
                  e.target.value,
              })
            }

            className="mt-1 w-full rounded-md border px-3 py-2"

          />

        </div>



        <button

          disabled={saving}

          className="
            w-full
            rounded-md
            bg-blue-600
            py-2.5
            text-white
            hover:bg-blue-700
            disabled:opacity-50
          "

        >

          {saving
            ? 'Saving...'
            : 'Save Gateway Settings'
          }

        </button>



      </form>


    </div>

  );

}