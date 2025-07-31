            following: []
          });
            followers: [],

            created_at: new Date().toISOString(),
        if (createError) {
            email_confirmed_at: new Date().toISOString(),
          console.error('Error creating profile:', createError);
            email_confirmed: true,
          setError('Email confirmado pero hubo un error creando el perfil. Contacta con soporte.');
            is_partner: false,
          setLoading(false);
            is_owner: true,
          return;
            photo_url: user.user_metadata?.photo_url || null,
        }
            display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || '',
      } else if (existingProfile) {
            email: user.email,
        // Profile exists, update confirmation status
            id: user.id,
        const { error: updateError } = await supabaseClient
          .insert({
          .from('profiles')
          .from('profiles')
          .update({
        const { error: createError } = await supabaseClient
            email_confirmed: true,
        console.log('Creating profile for confirmed user');
            email_confirmed_at: new Date().toISOString(),
        // Profile doesn't exist, create it
            updated_at: new Date().toISOString()
      if (profileError && profileError.code === 'PGRST116') {
          })

          .eq('id', user.id);
        .single();

        .eq('id', user.id)
        if (updateError) {
        .select('id')
          console.error('Error updating profile confirmation:', updateError);
        .from('profiles')
        }
      const { data: existingProfile, error: profileError } = await supabaseClient
      }
    try {
    } catch (profileError) {
    // Create user profile if it doesn't exist
      console.error('Error checking/creating profile:', profileError);
    
    }
    console.log('Email confirmed successfully for user:', user.email);

  const handleSuccessfulConfirmation = async (user: any) => {
    setConfirmed(true);

    setLoading(false);
  };
  };
    }
      setLoading(false);
      setShowResendForm(true);
      setError('Error al procesar la confirmación');
      console.error('Confirmation error:', error);
    } catch (error) {
      setLoading(false);
      setShowResendForm(true);
      setError('Enlace de confirmación inválido o incompleto');
      // If no token_hash, show error and resend form