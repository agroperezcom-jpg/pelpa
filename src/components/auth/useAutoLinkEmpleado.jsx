import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Hook que automáticamente vincula un Usuario con su Empleado en el primer acceso.
 * Garantiza que la cadena User → Empleado siempre esté completa.
 */
export function useAutoLinkEmpleado() {
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (hasRunRef.current) return;
    hasRunRef.current = true;

    const linkEmpleado = async () => {
      try {
        const response = await base44.functions.invoke('autoLinkEmpleado');
        const { data } = response;
        
        if (data?.status === 'already_linked') {
          console.log('✅ Empleado ya estaba vinculado');
        } else if (data?.status === 'linked') {
          console.log('✅ Empleado vinculado en este acceso');
        } else if (data?.status === 'created') {
          console.log('✅ Nuevo Empleado creado automáticamente');
        }
      } catch (err) {
        console.error('⚠️ Error en autoLinkEmpleado:', err.message);
        // No lanzar error - permite que la app continúe
      }
    };

    linkEmpleado();
  }, []);
}