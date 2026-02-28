import { useNavigate } from "react-router";
import { useState } from "react";
import { Shield, ShoppingCart, Package } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { setRole } = useAuth();
  const [selectedRole, setSelectedRole] = useState<"admin" | "seller" | "buyer" | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRole) {
      setRole(selectedRole);
      if (selectedRole === "admin") {
        navigate("/");
      } else if (selectedRole === "seller") {
        navigate("/sales");
      } else if (selectedRole === "buyer") {
        navigate("/purchases");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-8">
      <div className="w-full max-w-4xl">
        <div className="bg-white border-2 border-gray-300 p-8">
          {/* Logo Placeholder */}
          <div className="flex justify-center mb-8">
            <div className="w-48 h-16 bg-gray-300 flex items-center justify-center border border-gray-400">
              <span className="text-sm text-gray-600">LOGO PLACEHOLDER</span>
            </div>
          </div>

          <h1 className="text-2xl text-center mb-2 text-gray-900">Sign In</h1>
          <p className="text-center text-sm text-gray-600 mb-8">Select your role to continue</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Role Selection */}
            <div>
              <label className="block text-sm mb-3 text-gray-700">User Role</label>
              <div className="grid grid-cols-3 gap-4">
                {/* Admin Role */}
                <button
                  type="button"
                  onClick={() => setSelectedRole("admin")}
                  className={`p-6 border-2 hover:bg-gray-50 transition-all ${
                    selectedRole === "admin"
                      ? "border-gray-900 bg-gray-100"
                      : "border-gray-300 bg-white"
                  }`}
                >
                  <div className="flex flex-col items-center gap-3">
                    <div
                      className={`w-16 h-16 rounded-full border-2 flex items-center justify-center ${
                        selectedRole === "admin"
                          ? "border-gray-900 bg-gray-200"
                          : "border-gray-400 bg-gray-100"
                      }`}
                    >
                      <Shield className="w-8 h-8 text-gray-700" />
                    </div>
                    <div className="text-center">
                      <div className="text-lg text-gray-900 mb-1">Administrator</div>
                      <div className="text-xs text-gray-600">Full system access</div>
                      <div className="text-xs text-gray-500 mt-1">All permissions</div>
                    </div>
                  </div>
                </button>

                {/* Seller Role */}
                <button
                  type="button"
                  onClick={() => setSelectedRole("seller")}
                  className={`p-6 border-2 hover:bg-gray-50 transition-all ${
                    selectedRole === "seller"
                      ? "border-gray-900 bg-gray-100"
                      : "border-gray-300 bg-white"
                  }`}
                >
                  <div className="flex flex-col items-center gap-3">
                    <div
                      className={`w-16 h-16 rounded-full border-2 flex items-center justify-center ${
                        selectedRole === "seller"
                          ? "border-gray-900 bg-gray-200"
                          : "border-gray-400 bg-gray-100"
                      }`}
                    >
                      <ShoppingCart className="w-8 h-8 text-gray-700" />
                    </div>
                    <div className="text-center">
                      <div className="text-lg text-gray-900 mb-1">Seller</div>
                      <div className="text-xs text-gray-600">Sales operations</div>
                      <div className="text-xs text-gray-500 mt-1">View only reports</div>
                    </div>
                  </div>
                </button>

                {/* Buyer Role */}
                <button
                  type="button"
                  onClick={() => setSelectedRole("buyer")}
                  className={`p-6 border-2 hover:bg-gray-50 transition-all ${
                    selectedRole === "buyer"
                      ? "border-gray-900 bg-gray-100"
                      : "border-gray-300 bg-white"
                  }`}
                >
                  <div className="flex flex-col items-center gap-3">
                    <div
                      className={`w-16 h-16 rounded-full border-2 flex items-center justify-center ${
                        selectedRole === "buyer"
                          ? "border-gray-900 bg-gray-200"
                          : "border-gray-400 bg-gray-100"
                      }`}
                    >
                      <Package className="w-8 h-8 text-gray-700" />
                    </div>
                    <div className="text-center">
                      <div className="text-lg text-gray-900 mb-1">Buyer</div>
                      <div className="text-xs text-gray-600">Purchase from inventory</div>
                      <div className="text-xs text-gray-500 mt-1">Browse & order products</div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm mb-2 text-gray-700">
                Email
              </label>
              <input
                type="email"
                id="email"
                className="w-full px-4 py-3 border-2 border-gray-300 bg-white text-gray-900"
                placeholder="email@example.com"
                required
              />
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm mb-2 text-gray-700">
                Password
              </label>
              <input
                type="password"
                id="password"
                className="w-full px-4 py-3 border-2 border-gray-300 bg-white text-gray-900"
                placeholder="••••••••"
                required
              />
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={!selectedRole}
              className={`w-full py-3 border-2 border-gray-900 transition-all ${
                selectedRole
                  ? "bg-gray-800 text-white hover:bg-gray-700"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              Sign In as {selectedRole === "admin" ? "Administrator" : selectedRole === "seller" ? "Seller" : selectedRole === "buyer" ? "Buyer" : "..."}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}