/*
  # Función para eliminar usuario completamente

  1. Nueva Función
    - `delete_user_completely` - Función que elimina un usuario y todos sus datos relacionados
    - Bypassa RLS usando SECURITY DEFINER
    - Solo permite que el usuario elimine su propia cuenta

  2. Seguridad
    - Verifica que el usuario autenticado sea el mismo que se está eliminando
    - Usa SECURITY DEFINER para bypass RLS temporalmente
*/

-- Función para eliminar usuario completamente
CREATE OR REPLACE FUNCTION delete_user_completely(user_id_to_delete uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  result json;
BEGIN
  -- Verificar que el usuario autenticado sea el mismo que se está eliminando
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;
  
  IF current_user_id != user_id_to_delete THEN
    RAISE EXCEPTION 'No tienes permisos para eliminar esta cuenta';
  END IF;
  
  -- Eliminar datos relacionados en orden (para evitar violaciones de foreign key)
  
  -- 1. Eliminar mensajes de chat
  DELETE FROM chat_messages WHERE sender_id = user_id_to_delete;
  
  -- 2. Eliminar conversaciones de chat
  DELETE FROM chat_conversations WHERE user_id = user_id_to_delete;
  
  -- 3. Eliminar reseñas de servicios
  DELETE FROM service_reviews WHERE customer_id = user_id_to_delete;
  
  -- 4. Eliminar carrito de usuario
  DELETE FROM user_carts WHERE user_id = user_id_to_delete;
  
  -- 5. Eliminar pedidos
  DELETE FROM orders WHERE customer_id = user_id_to_delete;
  
  -- 6. Eliminar reservas
  DELETE FROM bookings WHERE customer_id = user_id_to_delete;
  
  -- 7. Eliminar comentarios
  DELETE FROM comments WHERE user_id = user_id_to_delete;
  
  -- 8. Eliminar posts (esto también eliminará comentarios relacionados por CASCADE)
  DELETE FROM posts WHERE user_id = user_id_to_delete;
  
  -- 9. Eliminar datos de mascotas
  DELETE FROM pet_behavior WHERE user_id = user_id_to_delete;
  DELETE FROM pet_health WHERE user_id = user_id_to_delete;
  DELETE FROM pet_albums WHERE user_id = user_id_to_delete;
  DELETE FROM pets WHERE owner_id = user_id_to_delete;
  
  -- 10. Finalmente, eliminar el perfil del usuario
  DELETE FROM profiles WHERE id = user_id_to_delete;
  
  -- Verificar que el perfil se eliminó
  IF EXISTS (SELECT 1 FROM profiles WHERE id = user_id_to_delete) THEN
    RAISE EXCEPTION 'No se pudo eliminar el perfil del usuario';
  END IF;
  
  result := json_build_object(
    'success', true,
    'message', 'Usuario eliminado completamente',
    'user_id', user_id_to_delete
  );
  
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- En caso de error, retornar información del error
    result := json_build_object(
      'success', false,
      'error', SQLERRM,
      'user_id', user_id_to_delete
    );
    RETURN result;
END;
$$;

-- Dar permisos para que usuarios autenticados puedan ejecutar la función
GRANT EXECUTE ON FUNCTION delete_user_completely(uuid) TO authenticated;