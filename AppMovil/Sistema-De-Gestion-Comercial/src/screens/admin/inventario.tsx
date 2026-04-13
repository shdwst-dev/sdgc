import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, FlatList, Alert, ActivityIndicator, Dimensions } from 'react-native';
import { Plus, Search, Filter, Trash2, X, PencilLine, Package, Barcode, ChevronRight, RefreshCw, Camera, Image as ImageIcon } from 'lucide-react-native';
import { CommonActions, useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ApiError } from '../../services/auth';
import {
  actualizarProducto,
  actualizarProductoFormData,
  crearProducto,
  crearProductoFormData,
  eliminarProducto,
  getInventarioCatalogos,
  getInventario,
  getProductoById,
  InventarioCatalogos,
  InventarioProducto,
} from '../../services/inventario';
import { clearToken, getToken, hydrateToken } from '../../services/storage';
import { useToast } from '../../components/Toast';

const { width } = Dimensions.get('window');

type UiProduct = {
  id: string;
  idProducto: number;
  idSubcategoria: number | null;
  idTienda: number | null;
  sku: string;
  name: string;
  category: string;
  stock: number;
  stockMinimo: number | null;
  precioBase: number | null;
  precioUnitario: number | null;
  idEstatus: number | null;
  imagenUrl: string | null;
  price: string;
};

type ModalMode = 'view' | 'edit' | 'create';
type CatalogKey = 'idMedida' | 'idUnidad' | 'idSubcategoria' | 'idEstatus' | 'idTienda';

type ProductForm = {
  idProducto: number | null;
  sku: string;
  nombre: string;
  categoria: string;
  stock: string;
  stockMinimo: string;
  precioBase: string;
  precioUnitario: string;
  idEstatus: string;
  idMedida: string;
  idUnidad: string;
  idSubcategoria: string;
  idTienda: string;
  imagenUrl: string;
};

const defaultForm: ProductForm = {
  idProducto: null,
  sku: '',
  nombre: '',
  categoria: '',
  stock: '0',
  stockMinimo: '',
  precioBase: '',
  precioUnitario: '',
  idEstatus: '1',
  idMedida: '1',
  idUnidad: '1',
  idSubcategoria: '1',
  idTienda: '',
  imagenUrl: '',
};

function formatCurrency(value: number | null): string {
  if (value === null) return 'N/A';
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2,
  }).format(value);
}

function toUiProduct(product: InventarioProducto): UiProduct {
  return {
    id: String(product.id),
    idProducto: product.id,
    idSubcategoria: product.idSubcategoria,
    idTienda: null,
    sku: product.sku,
    name: product.nombre,
    category: product.categoria,
    stock: product.stockActual,
    stockMinimo: product.stockMinimo,
    precioBase: product.precioBase,
    precioUnitario: product.precioUnitario,
    idEstatus: product.idEstatus,
    imagenUrl: product.imagenUrl,
    price: formatCurrency(product.precioUnitario),
  };
}

function toFormFromProduct(product: InventarioProducto): ProductForm {
  return {
    idProducto: product.id,
    sku: product.sku,
    nombre: product.nombre,
    categoria: product.categoria,
    stock: String(product.stockActual),
    stockMinimo: product.stockMinimo !== null ? String(product.stockMinimo) : '',
    precioBase: product.precioBase !== null ? String(product.precioBase) : '',
    precioUnitario: product.precioUnitario !== null ? String(product.precioUnitario) : '',
    idEstatus: product.idEstatus !== null ? String(product.idEstatus) : '1',
    idMedida: '1',
    idUnidad: '1',
    idSubcategoria: product.idSubcategoria !== null ? String(product.idSubcategoria) : '1',
    idTienda: '',
    imagenUrl: product.imagenUrl || '',
  };
}

function toFormFromUiProduct(product: UiProduct): ProductForm {
  return {
    idProducto: product.idProducto,
    sku: product.sku,
    nombre: product.name,
    categoria: product.category,
    stock: String(product.stock),
    stockMinimo: product.stockMinimo !== null ? String(product.stockMinimo) : '',
    precioBase: product.precioBase !== null ? String(product.precioBase) : '',
    precioUnitario: product.precioUnitario !== null ? String(product.precioUnitario) : '',
    idEstatus: product.idEstatus !== null ? String(product.idEstatus) : '1',
    idMedida: '1',
    idUnidad: '1',
    idSubcategoria: product.idSubcategoria !== null ? String(product.idSubcategoria) : '1',
    idTienda: '',
    imagenUrl: product.imagenUrl || '',
  };
}

function toPositiveNumber(value: string): number | null {
  const parsed = Number(value.replace(',', '.'));
  return (!Number.isFinite(parsed) || parsed <= 0) ? null : parsed;
}

function toPositiveInteger(value: string): number | null {
  const parsed = Number(value);
  return (!Number.isInteger(parsed) || parsed <= 0) ? null : parsed;
}

function toNonNegativeInteger(value: string): number | null {
  const parsed = Number(value);
  return (!Number.isInteger(parsed) || parsed < 0) ? null : parsed;
}

function getStockBadgeStyle(stock: number, stockMinimo: number | null): { bg: string; text: string; label: string } {
  if (stock <= 0) return { bg: '#FEE2E2', text: '#B91C1C', label: 'Sin Stock' };
  const threshold = stockMinimo ?? 10;
  if (stock <= threshold) return { bg: '#FEF3C7', text: '#B45309', label: 'Bajo' };
  return { bg: '#DCFCE7', text: '#15803D', label: 'OK' };
}

export default function Inventario() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { showToast } = useToast();
  
  const [products, setProducts] = useState<UiProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<UiProduct | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('view');
  const [form, setForm] = useState<ProductForm>(defaultForm);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [displayCount, setDisplayCount] = useState(25);
  const [catalogos, setCatalogos] = useState<InventarioCatalogos>({
    subcategorias: [], medidas: [], unidades: [], estatus: [], tiendas: [],
  });
  const [selectorVisible, setSelectorVisible] = useState(false);
  const [selectorKey, setSelectorKey] = useState<CatalogKey>('idSubcategoria');
  const [selectedImage, setSelectedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);

  const goToLogin = useCallback(() => {
    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'RoleSelect' as never }] }));
  }, [navigation]);

  const requireToken = useCallback(async (): Promise<string | null> => {
    let token = getToken();
    if (!token) token = await hydrateToken();
    if (!token) { await clearToken(); goToLogin(); return null; }
    return token;
  }, [goToLogin]);

  const loadInventario = useCallback(async (showFullLoader = true) => {
    const token = await requireToken();
    if (!token) return;

    if (showFullLoader) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      const [inventarioResult, catalogosResult] = await Promise.allSettled([
        getInventario(token),
        getInventarioCatalogos(token),
      ]);

      if (inventarioResult.status === 'fulfilled') {
        setProducts(inventarioResult.value.map(toUiProduct));
      } else {
        throw inventarioResult.reason;
      }

      if (catalogosResult.status === 'fulfilled') {
        setCatalogos(catalogosResult.value);
      }
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        await clearToken();
        Alert.alert('Sesion expirada', 'Inicia sesion nuevamente.');
        goToLogin();
        return;
      }
      const message = requestError instanceof Error ? requestError.message : 'No se pudo cargar el inventario.';
      setError(message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [goToLogin, requireToken]);

  useFocusEffect(
    useCallback(() => {
      loadInventario().catch(() => {
        setError('Error al sincronizar inventario.');
        setIsLoading(false);
        setIsRefreshing(false);
      });
    }, [loadInventario])
  );

  useEffect(() => {
    const suggestedSearch = route?.params?.search;
    if (typeof suggestedSearch === 'string' && suggestedSearch.trim().length > 0) {
      setQuery(suggestedSearch.trim());
      navigation.setParams({ search: undefined } as never);
    }
  }, [route?.params?.search, navigation]);

  const filteredProducts = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return products;
    return products.filter((product) =>
      product.sku.toLowerCase().includes(term) ||
      product.name.toLowerCase().includes(term) ||
      product.category.toLowerCase().includes(term)
    );
  }, [products, query]);

  const paginatedProducts = useMemo(() => filteredProducts.slice(0, displayCount), [filteredProducts, displayCount]);

  const handleLoadMore = useCallback(() => {
    if (displayCount < filteredProducts.length) setDisplayCount((prev) => prev + 25);
  }, [displayCount, filteredProducts.length]);

  const openSelector = (key: CatalogKey) => {
    setSelectorKey(key);
    setSelectorVisible(true);
  };

  const handleOpenCreate = () => {
    if (catalogos.subcategorias.length === 0) {
      Alert.alert('Incompleto', 'Se requieren catálogos para crear productos.');
      return;
    }
    setSelectedProduct(null);
    setForm({
      ...defaultForm,
      idSubcategoria: String(catalogos.subcategorias[0]?.id || '1'),
      idMedida: String(catalogos.medidas[0]?.id || '1'),
      idUnidad: String(catalogos.unidades[0]?.id || '1'),
      idEstatus: String(catalogos.estatus[0]?.id || '1'),
    });
    setModalMode('create');
    setSelectedImage(null);
    setIsModalVisible(true);
  };

  const handleOpenDetail = async (product: UiProduct) => {
    setSelectedProduct(product);
    setForm(toFormFromUiProduct(product));
    setModalMode('view');
    setSelectedImage(null);
    setIsModalVisible(true);
    setIsDetailLoading(true);

    try {
      const token = await requireToken();
      if (!token) return;
      const detail = await getProductoById(token, product.idProducto);
      setForm({ ...toFormFromProduct(detail), idTienda: '' });
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        await clearToken();
        setIsModalVisible(false);
        goToLogin();
        return;
      }
      Alert.alert('Fallo', 'No se pudo cargar el detalle extendido.');
    } finally {
      setIsDetailLoading(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Necesitamos acceso a la cámara para tomar fotos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0]);
    }
  };

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Necesitamos acceso a tu galería para elegir fotos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0]);
    }
  };

  const handleSave = async () => {
    if (isSaving || isDetailLoading) return;
    const nombre = form.nombre.trim();
    const precioBase = toPositiveNumber(form.precioBase);
    const precioUnitario = toPositiveNumber(form.precioUnitario);
    if (!nombre || !precioBase || !precioUnitario) {
      Alert.alert('Valores inválidos', 'Revisa el nombre y los precios.');
      return;
    }

    const token = await requireToken();
    if (!token) return;
    setIsSaving(true);

    try {
      if (modalMode === 'create') {
        const idMedida = toPositiveInteger(form.idMedida);
        const idUnidad = toPositiveInteger(form.idUnidad);
        const idSubcategoria = toPositiveInteger(form.idSubcategoria);
        if (!idMedida || !idUnidad || !idSubcategoria) return;

        if (selectedImage) {
          const fd = new FormData();
          fd.append('id_medida', String(idMedida));
          fd.append('id_unidad', String(idUnidad));
          fd.append('id_subcategoria', String(idSubcategoria));
          fd.append('nombre', nombre);
          fd.append('precio_base', String(precioBase));
          fd.append('precio_unitario', String(precioUnitario));
          fd.append('codigo_barras', form.sku.trim() || '');
          fd.append('id_estatus', form.idEstatus);
          if (form.idTienda) fd.append('id_tienda', form.idTienda);
          
          const uriParts = selectedImage.uri.split('.');
          const fileType = uriParts[uriParts.length - 1];
          fd.append('imagen', {
            uri: selectedImage.uri,
            name: `photo.${fileType}`,
            type: `image/${fileType}`,
          } as any);

          await crearProductoFormData(token, fd);
        } else {
          await crearProducto(token, {
            idMedida, idUnidad, idSubcategoria,
            nombre, precioBase, precioUnitario,
            codigoBarras: form.sku.trim() || undefined,
            idTienda: form.idTienda ? Number(form.idTienda) : undefined,
            idEstatus: Number(form.idEstatus),
          });
        }
        showToast({ message: 'Producto registrado.', type: 'success' });
      } else {
        if (!form.idProducto) return;
        const stock = toNonNegativeInteger(form.stock);
        const idSubcategoria = Number(form.idSubcategoria);
        if (stock === null) return;

        if (selectedImage) {
          const fd = new FormData();
          fd.append('nombre', nombre);
          fd.append('precio_base', String(precioBase));
          fd.append('precio_unitario', String(precioUnitario));
          fd.append('stock', String(stock));
          fd.append('stock_minimo', form.stockMinimo.trim() ? form.stockMinimo : '0');
          fd.append('id_subcategoria', String(idSubcategoria));
          fd.append('id_estatus', form.idEstatus);
          fd.append('codigo_barras', form.sku.trim() || '');
          if (form.idTienda) fd.append('id_tienda', form.idTienda);

          const uriParts = selectedImage.uri.split('.');
          const fileType = uriParts[uriParts.length - 1];
          fd.append('imagen', {
            uri: selectedImage.uri,
            name: `photo.${fileType}`,
            type: `image/${fileType}`,
          } as any);

          await actualizarProductoFormData(token, form.idProducto, fd);
        } else {
          await actualizarProducto(token, form.idProducto, {
            nombre, precioBase, precioUnitario, stock,
            stockMinimo: form.stockMinimo.trim() ? Number(form.stockMinimo) : undefined,
            idSubcategoria,
            idTienda: form.idTienda ? Number(form.idTienda) : undefined,
            idEstatus: Number(form.idEstatus),
            imagenUrl: form.imagenUrl || undefined,
          });
        }
        showToast({ message: 'Inventario actualizado.', type: 'success' });
      }
      setIsModalVisible(false);
      await loadInventario(false);
    } catch (e) {
      let message = 'Error al persistir cambios.';
      if (e instanceof ApiError && e.message) {
        message = e.message;
      }
      showToast({ message, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const renderProductItem = ({ item }: { item: UiProduct }) => {
    const badge = getStockBadgeStyle(item.stock, item.stockMinimo);
    return (
      <TouchableOpacity 
        style={styles.productCard}
        onPress={() => handleOpenDetail(item)}
      >
        <View style={styles.cardInfo}>
          <View style={styles.thumbContainer}>
             {item.imagenUrl ? (
               <Image source={{ uri: item.imagenUrl }} style={styles.listThumb} />
             ) : (
               <View style={styles.listThumbEmpty}>
                  <Package size={20} color="#94A3B8" />
               </View>
             )}
          </View>
          <View style={styles.itemMain}>
            <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
            <View style={styles.skuRow}>
               <Barcode size={14} color="#94A3B8" />
               <Text style={styles.skuText}>{item.sku}</Text>
            </View>
          </View>
          <View style={styles.statusCol}>
             <View style={[styles.stockBadge, { backgroundColor: badge.bg }]}>
                <Text style={[styles.stockBadgeText, { color: badge.text }]}>{item.stock}</Text>
             </View>
             <Text style={styles.itemCategory} numberOfLines={1}>{item.category}</Text>
          </View>
          <ChevronRight size={18} color="#CBD5E1" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.headerTitle}>Inventario</Text>
          <Text style={styles.headerSubtitle}>Gestión de Stock Central</Text>
        </View>
        <TouchableOpacity 
          style={styles.refreshBtn}
          onPress={() => loadInventario(false)} 
          disabled={isRefreshing}
        >
          {isRefreshing ? <ActivityIndicator size="small" color="#1C273F" /> : <RefreshCw size={22} color="#1C273F" />}
        </TouchableOpacity>
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Search size={20} color="#94A3B8" />
          <TextInput
            placeholder="Buscar por nombre o SKU..."
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
          />
        </View>
        <TouchableOpacity style={styles.addFab} onPress={handleOpenCreate}>
          <Plus size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loaderArea}>
          <ActivityIndicator size="large" color="#1C273F" />
          <Text style={styles.loaderLabel}>Sincronizando catálogo...</Text>
        </View>
      ) : (
        <FlatList
          data={paginatedProducts}
          renderItem={renderProductItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <View style={styles.emptyView}>
               <Package size={64} color="#CBD5E1" />
               <Text style={styles.emptyText}>No se encontraron productos.</Text>
            </View>
          }
        />
      )}

      {/* Product Detail Modal */}
      <Modal visible={isModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.sheetHeader}>
               <View style={styles.dragIndicator} />
               <TouchableOpacity style={styles.closeModalBtn} onPress={() => setIsModalVisible(false)}>
                  <X size={24} color="#1E293B" />
               </TouchableOpacity>
            </View>

            {isDetailLoading ? (
              <ActivityIndicator style={{ marginTop: 50 }} size="large" color="#1C273F" />
            ) : (
              <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
                <Text style={styles.modalMainTitle}>
                   {modalMode === 'create' ? 'Nuevo' : (modalMode === 'edit' ? 'Editar' : 'Detalles')}
                </Text>

                {/* Imagen Preview & Picker */}
                <View style={styles.imageSection}>
                  {selectedImage ? (
                    <Image source={{ uri: selectedImage.uri }} style={styles.previewImage} />
                  ) : form.imagenUrl ? (
                    <Image source={{ uri: form.imagenUrl }} style={styles.previewImage} />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Camera size={40} color="#94A3B8" />
                    </View>
                  )}
                  {modalMode !== 'view' && (
                    <View style={styles.imagePickerRow}>
                      <TouchableOpacity style={styles.pickImageBtn} onPress={pickImage}>
                        <Camera size={18} color="#FFF" />
                        <Text style={styles.pickImageBtnText}>Cámara</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.pickImageBtn, styles.galleryBtn]} onPress={pickFromGallery}>
                        <ImageIcon size={18} color="#FFF" />
                        <Text style={styles.pickImageBtnText}>Galería</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                <View style={[styles.field, (modalMode === 'view') && styles.fieldDisabled]}>
                   <Text style={styles.fieldLabel}>Nombre del Producto</Text>
                   <TextInput 
                      style={styles.fieldInput} 
                      value={form.nombre} 
                      editable={modalMode !== 'view'}
                      onChangeText={(v) => setForm(f => ({...f, nombre: v}))}
                   />
                </View>

                <View style={styles.fieldRow}>
                   <View style={[styles.field, {flex: 1}, (modalMode === 'view') && styles.fieldDisabled]}>
                      <Text style={styles.fieldLabel}>SKU / Código</Text>
                      <TextInput 
                          style={styles.fieldInput} 
                          value={form.sku} 
                          editable={modalMode !== 'view'}
                          onChangeText={(v) => setForm(f => ({...f, sku: v}))}
                      />
                   </View>
                </View>

                <View style={styles.fieldRow}>
                   <View style={[styles.field, {flex: 1}, (modalMode === 'view' || modalMode === 'create') && styles.fieldDisabled]}>
                      <Text style={styles.fieldLabel}>Stock Actual</Text>
                      <TextInput 
                          style={styles.fieldInput} 
                          value={form.stock}
                          keyboardType="numeric"
                          editable={modalMode === 'edit'}
                          onChangeText={(v) => setForm(f => ({...f, stock: v}))}
                      />
                   </View>
                   <View style={[styles.field, {flex: 1}, (modalMode === 'view') && styles.fieldDisabled]}>
                      <Text style={styles.fieldLabel}>Stock Mínimo</Text>
                      <TextInput 
                          style={styles.fieldInput} 
                          value={form.stockMinimo}
                          keyboardType="numeric"
                          editable={modalMode !== 'view'}
                          onChangeText={(v) => setForm(f => ({...f, stockMinimo: v}))}
                      />
                   </View>
                </View>

                <View style={styles.fieldRow}>
                   <View style={[styles.field, {flex: 1}, (modalMode === 'view') && styles.fieldDisabled]}>
                      <Text style={styles.fieldLabel}>Precio Público</Text>
                      <TextInput 
                          style={styles.fieldInput} 
                          value={form.precioUnitario}
                          keyboardType="decimal-pad"
                          editable={modalMode !== 'view'}
                          onChangeText={(v) => setForm(f => ({...f, precioUnitario: v}))}
                      />
                   </View>
                   <View style={[styles.field, {flex: 1}, (modalMode === 'view') && styles.fieldDisabled]}>
                      <Text style={styles.fieldLabel}>Costo Base</Text>
                      <TextInput 
                          style={styles.fieldInput} 
                          value={form.precioBase}
                          keyboardType="decimal-pad"
                          editable={modalMode !== 'view'}
                          onChangeText={(v) => setForm(f => ({...f, precioBase: v}))}
                      />
                   </View>
                </View>

                <View style={{ height: 30 }} />

                {modalMode === 'view' ? (
                  <TouchableOpacity style={styles.primaryActionBtn} onPress={() => setModalMode('edit')}>
                     <PencilLine size={20} color="#FFF" />
                     <Text style={styles.primaryActionBtnText}>Editar Registro</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    style={[styles.saveBtn, isSaving && { opacity: 0.7 }]} 
                    onPress={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Guardar Cambios</Text>}
                  </TouchableOpacity>
                )}
                
                <View style={{ height: 60 }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  topHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 50, paddingHorizontal: 20, marginBottom: 20 },
  headerTitle: { fontSize: 34, fontWeight: '900', color: '#1E293B', letterSpacing: -1 },
  headerSubtitle: { fontSize: 14, color: '#64748B', fontWeight: '500', marginTop: -4 },
  refreshBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  searchSection: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 16 },
  searchBar: { flex: 1, height: 50, backgroundColor: '#FFF', borderRadius: 16, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 1 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15, color: '#1E293B', fontWeight: '500' },
  addFab: { width: 50, height: 50, borderRadius: 16, backgroundColor: '#1C273F', justifyContent: 'center', alignItems: 'center', elevation: 3 },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  productCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10, elevation: 1 },
  cardInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemMain: { flex: 1, gap: 4 },
  itemName: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  skuRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  skuText: { fontSize: 13, color: '#94A3B8', fontWeight: '600' },
  statusCol: { alignItems: 'flex-end', gap: 4 },
  itemCategory: { fontSize: 11, color: '#64748B', fontWeight: '700', textTransform: 'uppercase', maxWidth: 100 },
  stockBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
  stockBadgeText: { fontSize: 14, fontWeight: '900' },
  loaderArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loaderLabel: { marginTop: 12, color: '#64748B', fontWeight: '600' },
  emptyView: { flex: 1, alignItems: 'center', marginTop: 100, gap: 16 },
  emptyText: { color: '#94A3B8', fontSize: 16, fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, height: '85%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'center', position: 'relative', marginBottom: 20 },
  dragIndicator: { width: 40, height: 5, backgroundColor: '#E2E8F0', borderRadius: 3 },
  closeModalBtn: { position: 'absolute', right: 0, top: -4 },
  modalMainTitle: { fontSize: 28, fontWeight: '900', color: '#1E293B', marginBottom: 24, letterSpacing: -0.5 },
  formScroll: { flex: 1 },
  field: { marginBottom: 20, backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16 },
  fieldDisabled: { opacity: 0.6 },
  fieldLabel: { fontSize: 11, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 4, letterSpacing: 1 },
  fieldInput: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  fieldRow: { flexDirection: 'row', gap: 12 },
  primaryActionBtn: { backgroundColor: '#1C273F', padding: 20, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  primaryActionBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  saveBtn: { backgroundColor: '#10B981', padding: 20, borderRadius: 20, alignItems: 'center' },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  imageSection: { alignItems: 'center', marginBottom: 24, gap: 12 },
  previewImage: { width: 120, height: 120, borderRadius: 20, backgroundColor: '#F1F5F9' },
  imagePlaceholder: { width: 120, height: 120, borderRadius: 20, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  pickImageBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1C273F', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, gap: 8, flex: 1, justifyContent: 'center' },
  galleryBtn: { backgroundColor: '#475569' },
  pickImageBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  imagePickerRow: { flexDirection: 'row', gap: 10, width: '100%', paddingHorizontal: 20, marginTop: 10 },
  thumbContainer: { width: 50, height: 50, borderRadius: 12, overflow: 'hidden', backgroundColor: '#F8FAFC' },
  listThumb: { width: '100%', height: '100%', resizeMode: 'cover' },
  listThumbEmpty: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed' },
});
