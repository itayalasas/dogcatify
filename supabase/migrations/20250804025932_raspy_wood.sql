/*
  # Agregar columna album_id a la tabla posts

  1. Cambios
    - Agregar columna `album_id` a la tabla `posts`
    - Crear índice para mejor rendimiento
    - Agregar foreign key constraint

  2. Propósito
    - Permitir tracking de posts relacionados con álbumes
    - Facilitar eliminación automática cuando se elimina álbum
    - Mejorar funcionalidad de tiempo real del feed
*/

-- Agregar columna album_id a la tabla posts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'album_id'
  ) THEN
    ALTER TABLE posts ADD COLUMN album_id uuid REFERENCES pet_albums(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Crear índice para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_posts_album_id ON posts(album_id) WHERE album_id IS NOT NULL;

-- Comentario para documentar el propósito de la columna
COMMENT ON COLUMN posts.album_id IS 'Reference to pet_albums table for posts created from shared albums';