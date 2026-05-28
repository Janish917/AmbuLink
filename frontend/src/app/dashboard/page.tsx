import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export default async function DashboardIndex() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  let userRole = 'DRIVER'; // Default fallback

  if (token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const decoded = JSON.parse(jsonPayload);
      if (decoded && decoded.role) {
        userRole = decoded.role;
      }
    } catch (e) {
      console.error("Failed to decode token in dashboard redirect:", e);
    }
  }

  if (userRole === 'POLICE') {
    redirect('/dashboard/police');
  } else if (userRole === 'HOSPITAL') {
    redirect('/dashboard/hospital');
  } else {
    redirect('/dashboard/driver');
  }
}
