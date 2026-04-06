import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, FlatList, Alert, ActivityIndicator } from 'react-native';
import { Plus, Search, Filter, Trash2, X, PencilLine } from 'lucide-react-native';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { ApiError } from '../../services/auth';
import {
  actualizarProducto,
  crearProducto,
  eliminarProducto,
  getInventario,
  getProductoById,
  InventarioProducto,
} from '../../services/inventario';
import { clearToken, getToken, hydrateToken } from '../../services/storage';

type UiProduct = {
  id: string;
  idProducto: number;
  sku: string;
  name: string;
  category: string;
  stock: number;
  stockMinimo: number | null;
  precioBase: number | null;
  precioUnitario: number | null;
  idEstatus: number | null;
  price: string;
};

type ModalMode = 'view' | 'edit' | 'create';

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
  imagenUrl: '',
};

function formatCurrency(value: number | null): string {
  if (value === null) {
    return 'N/A';
  }

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
    sku: product.sku,
    name: product.nombre,
    category: product.categoria,
    stock: product.stockActual,
    stockMinimo: product.stockMinimo,
    precioBase: product.precioBase,
    precioUnitario: product.precioUnitario,
    idEstatus: product.idEstatus,
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
    idSubcategoria: '1',
    imagenUrl: '',
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
    idSubcategoria: '1',
    imagenUrl: '',
  };
}

function toPositiveNumber(value: string): number | null {
  const parsed = Number(value.replace(',', '.'));

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function toPositiveInteger(value: string): number | null {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function getStockBadgeStyle(stock: number, stockMinimo: number | null): { bg: string; text: string } {
  if (stock <= 0) {
    return { bg: '#FEE2E2', text: '#B91C1C' };
  }

  const threshold = stockMinimo ?? 10;

  if (stock <= threshold) {
    return { bg: '#FEF3C7', text: '#B45309' };
  }

  return { bg: '#DCFCE7', text: '#15803D' };
}

export default function Inventario() {
  const navigation = useNavigation();
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

  const goToLogin = useCallback(() => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'InicioSesion' as never }],
      }),
    );
  }, [navigation]);

  const requireToken = useCallback(async (): Promise<string | null> => {
    let token = getToken();

    if (!token) {
      token = await hydrateToken();
    }

    if (!token) {
      await clearToken();
      goToLogin();
      return null;
    }

    return token;
  }, [goToLogin]);

  const loadInventario = useCallback(async (showFullLoader = true) => {
    const token = await requireToken();

    if (!token) {
      return;
    }

    if (showFullLoader) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    setError(null);

    try {
      const data = await getInventario(token);
      setProducts(data.map(toUiProduct));
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        await clearToken();
        Alert.alert('Sesion expirada', 'Inicia sesion nuevamente.');
        goToLogin();
        return;
      }

      const message = requestError instanceof Error
        ? requestError.message
        : 'No se pudo cargar el inventario.';

      setError(message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [goToLogin, requireToken]);

  useEffect(() => {
    loadInventario().catch(() => {
      setError('No se pudo cargar el inventario.');
      setIsLoading(false);
      setIsRefreshing(false);
    });
  }, [loadInventario]);

  const filteredProducts = useMemo(() => {
    const term = query.trim().toLowerCase();

    if (!term) {
      return products;
    }

    return products.filter((product) =>
      product.sku.toLowerCase().includes(term)
      || product.name.toLowerCase().includes(term)
      || product.category.toLowerCase().includes(term),
    );
  }, [products, query]);

  const handleOpenCreate = () => {
    setSelectedProduct(null);
    setForm(defaultForm);
    setModalMode('create');
    setIsModalVisible(true);
  };

  const handleOpenDetail = async (product: UiProduct) => {
    setSelectedProduct(product);
    setForm(toFormFromUiProduct(product));
    setModalMode('view');
    setIsModalVisible(true);
    setIsDetailLoading(true);

    try {
      const token = await requireToken();

      if (!token) {
        return;
      }

      const detail = await getProductoById(token, product.idProducto);
      setForm(toFormFromProduct(detail));
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        await clearToken();
        Alert.alert('Sesion expirada', 'Inicia sesion nuevamente.');
        setIsModalVisible(false);
        goToLogin();
        return;
      }

      Alert.alert('Aviso', requestError instanceof Error ? requestError.message : 'No se pudo cargar el detalle.');
    } finally {
      setIsDetailLoading(false);
    }
  };

  const performDelete = async (product: UiProduct) => {
    if (isDeletingId !== null) {
      return;
    }

    const token = await requireToken();

    if (!token) {
      return;
    }

    setIsDeletingId(product.idProducto);

    try {
      await eliminarProducto(token, product.idProducto);
      setProducts((prev) => prev.filter((item) => item.idProducto !== product.idProducto));
      Alert.alert('Listo', 'Producto eliminado correctamente.');
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        await clearToken();
        Alert.alert('Sesion expirada', 'Inicia sesion nuevamente.');
        goToLogin();
        return;
      }

      Alert.alert('Error', requestError instanceof Error ? requestError.message : 'No se pudo eliminar el producto.');
    } finally {
      setIsDeletingId(null);
    }
  };

  const handleDelete = (product: UiProduct) => {
    Alert.alert('Eliminar', `¿Estas seguro de eliminar ${product.name}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => performDelete(product) },
    ]);
  };

  const handleSave = async () => {
    if (isSaving || isDetailLoading) {
      return;
    }

    const nombre = form.nombre.trim();
    const precioBase = toPositiveNumber(form.precioBase);
    const precioUnitario = toPositiveNumber(form.precioUnitario);
    const idEstatus = toPositiveInteger(form.idEstatus);

    if (!nombre) {
      Alert.alert('Validacion', 'El nombre es obligatorio.');
      return;
    }

    if (!precioBase || !precioUnitario) {
      Alert.alert('Validacion', 'Captura precio base y precio unitario validos.');
      return;
    }

    if (!idEstatus) {
      Alert.alert('Validacion', 'Captura un estatus valido.');
      return;
    }

    const token = await requireToken();

    if (!token) {
      return;
    }

    setIsSaving(true);

    try {
      if (modalMode === 'create') {
        const idMedida = toPositiveInteger(form.idMedida);
        const idUnidad = toPositiveInteger(form.idUnidad);
        const idSubcategoria = toPositiveInteger(form.idSubcategoria);

        if (!idMedida || !idUnidad || !idSubcategoria) {
          Alert.alert('Validacion', 'Captura ids enteros validos para medida, unidad y subcategoria.');
          return;
        }

        await crearProducto(token, {
          idMedida,
          idUnidad,
          idSubcategoria,
          nombre,
          precioBase,
          precioUnitario,
          codigoBarras: form.sku.trim() || undefined,
          imagenUrl: form.imagenUrl.trim() || undefined,
          idEstatus,
        });

        Alert.alert('Listo', 'Producto creado correctamente.');
      } else {
        if (!form.idProducto) {
          Alert.alert('Error', 'No se encontro el id del producto.');
          return;
        }

        await actualizarProducto(token, form.idProducto, {
          nombre,
          precioBase,
          precioUnitario,
          codigoBarras: form.sku.trim() || undefined,
          imagenUrl: form.imagenUrl.trim() || undefined,
          idEstatus,
        });

        Alert.alert('Listo', 'Producto actualizado correctamente.');
      }

      setIsModalVisible(false);
      await loadInventario(false);
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        await clearToken();
        Alert.alert('Sesion expirada', 'Inicia sesion nuevamente.');
        setIsModalVisible(false);
        goToLogin();
        return;
      }

      Alert.alert('Error', requestError instanceof Error ? requestError.message : 'No se pudo guardar el producto.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartEdit = () => {
    if (isDetailLoading) {
      Alert.alert('Espera', 'Todavia se esta cargando el detalle del producto.');
      return;
    }

    if (!form.idProducto) {
      Alert.alert('Aviso', 'No hay un producto valido para editar.');
      return;
    }

    setModalMode('edit');
  };

  const renderProductItem = ({ item }: { item: UiProduct }) => {
    const badgeStyle = getStockBadgeStyle(item.stock, item.stockMinimo);

    return (
      <TouchableOpacity
        style={styles.productRow}
        onPress={() => {
          handleOpenDetail(item).catch(() => {
            Alert.alert('Error', 'No se pudo abrir el detalle del producto.');
          });
        }}
      >
        <View style={styles.skuCol}>
          <Text style={styles.cellText} numberOfLines={1}>{item.sku}</Text>
        </View>
        <View style={styles.nameCol}>
          <Text style={styles.productNameText} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.categoryText}>{item.category}</Text>
        </View>
        <View style={styles.stockCol}>
          <View style={[styles.badge, { backgroundColor: badgeStyle.bg }]}>
            <Text style={[styles.badgeText, { color: badgeStyle.text }]}>
              {item.stock}
            </Text>
          </View>
        </View>
        <View style={styles.actionsCol}>
          <TouchableOpacity onPress={() => handleDelete(item)} disabled={isDeletingId === item.idProducto}>
            {isDeletingId === item.idProducto ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <Trash2 size={18} color="#EF4444" />
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const isReadOnly = modalMode !== 'edit' && modalMode !== 'create';
  const isCreate = modalMode === 'create';

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Inventario</Text>

      <View style={styles.headerActions}>
        <View style={styles.searchBar}>
          <Search size={18} color="#9CA3AF" />
          <TextInput
            placeholder="Buscar producto..."
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
          />
        </View>
        <TouchableOpacity style={styles.filterBtn} onPress={() => loadInventario(false)} disabled={isRefreshing || isLoading}>
          {isRefreshing ? (
            <ActivityIndicator size="small" color="#101828" />
          ) : (
            <Filter size={20} color="#101828" />
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.addBtn} onPress={handleOpenCreate}>
        <Plus size={20} color="#FFF" />
        <Text style={styles.addBtnText}>Agregar Nuevo Producto</Text>
      </TouchableOpacity>

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>No se pudo cargar el inventario</Text>
          <Text style={styles.errorDescription}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadInventario()}>
            <Text style={styles.retryBtnText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.tableCard}>
        <View style={styles.tableHeader}>
          <Text style={styles.headerTextCol}>SKU</Text>
          <Text style={[styles.headerTextCol, { flex: 2 }]}>Producto</Text>
          <Text style={styles.headerTextCol}>Stock</Text>
          <Text style={styles.headerTextCol}>Accion</Text>
        </View>
        {isLoading ? (
          <View style={styles.loaderBox}>
            <ActivityIndicator size="large" color="#1C273F" />
            <Text style={styles.loaderText}>Cargando inventario...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredProducts}
            renderItem={renderProductItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={filteredProducts.length === 0 ? styles.emptyContainer : { paddingBottom: 20 }}
            ListEmptyComponent={<Text style={styles.emptyText}>No hay productos para mostrar.</Text>}
          />
        )}
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isCreate ? 'Nuevo Producto' : isReadOnly ? 'Detalles del Producto' : 'Editar Producto'}
              </Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <X size={24} color="#101828" />
              </TouchableOpacity>
            </View>

            {isDetailLoading ? (
              <View style={styles.loaderBox}>
                <ActivityIndicator size="large" color="#1C273F" />
                <Text style={styles.loaderText}>Cargando detalle...</Text>
              </View>
            ) : (
              <ScrollView style={styles.modalForm}>
                <Text style={styles.label}>Codigo de barras (SKU)</Text>
                <TextInput
                  style={isReadOnly ? styles.inputDisabled : styles.input}
                  value={form.sku}
                  editable={!isReadOnly}
                  onChangeText={(value) => setForm((prev) => ({ ...prev, sku: value }))}
                />

                <Text style={styles.label}>Nombre del Producto</Text>
                <TextInput
                  style={isReadOnly ? styles.inputDisabled : styles.input}
                  value={form.nombre}
                  editable={!isReadOnly}
                  onChangeText={(value) => setForm((prev) => ({ ...prev, nombre: value }))}
                />

                <Text style={styles.label}>Categoria</Text>
                <TextInput style={styles.inputDisabled} value={form.categoria} editable={false} />

                <View style={styles.rowInputs}>
                  <View style={styles.flexInputRight}>
                    <Text style={styles.label}>Stock</Text>
                    <TextInput style={styles.inputDisabled} value={form.stock} editable={false} />
                  </View>
                  <View style={styles.flexInputLeft}>
                    <Text style={styles.label}>Stock minimo</Text>
                    <TextInput style={styles.inputDisabled} value={form.stockMinimo || 'N/A'} editable={false} />
                  </View>
                </View>

                <View style={styles.rowInputs}>
                  <View style={styles.flexInputRight}>
                    <Text style={styles.label}>Precio base</Text>
                    <TextInput
                      style={isReadOnly ? styles.inputDisabled : styles.input}
                      value={form.precioBase}
                      editable={!isReadOnly}
                      keyboardType="decimal-pad"
                      onChangeText={(value) => setForm((prev) => ({ ...prev, precioBase: value }))}
                    />
                  </View>
                  <View style={styles.flexInputLeft}>
                    <Text style={styles.label}>Precio unitario</Text>
                    <TextInput
                      style={isReadOnly ? styles.inputDisabled : styles.input}
                      value={form.precioUnitario}
                      editable={!isReadOnly}
                      keyboardType="decimal-pad"
                      onChangeText={(value) => setForm((prev) => ({ ...prev, precioUnitario: value }))}
                    />
                  </View>
                </View>

                <Text style={styles.label}>Id estatus</Text>
                <TextInput
                  style={isReadOnly ? styles.inputDisabled : styles.input}
                  value={form.idEstatus}
                  editable={!isReadOnly}
                  keyboardType="number-pad"
                  onChangeText={(value) => setForm((prev) => ({ ...prev, idEstatus: value }))}
                />

                {!isReadOnly ? (
                  <>
                    {isCreate ? (
                      <>
                        <Text style={styles.helperText}>Para crear, captura ids reales de catalogos (medida, unidad y subcategoria).</Text>

                        <View style={styles.rowInputs}>
                          <View style={styles.flexInputRight}>
                            <Text style={styles.label}>Id medida</Text>
                            <TextInput
                              style={styles.input}
                              value={form.idMedida}
                              keyboardType="number-pad"
                              onChangeText={(value) => setForm((prev) => ({ ...prev, idMedida: value }))}
                            />
                          </View>
                          <View style={styles.flexInputLeft}>
                            <Text style={styles.label}>Id unidad</Text>
                            <TextInput
                              style={styles.input}
                              value={form.idUnidad}
                              keyboardType="number-pad"
                              onChangeText={(value) => setForm((prev) => ({ ...prev, idUnidad: value }))}
                            />
                          </View>
                        </View>

                        <Text style={styles.label}>Id subcategoria</Text>
                        <TextInput
                          style={styles.input}
                          value={form.idSubcategoria}
                          keyboardType="number-pad"
                          onChangeText={(value) => setForm((prev) => ({ ...prev, idSubcategoria: value }))}
                        />
                      </>
                    ) : null}

                    <Text style={styles.label}>Imagen URL (opcional)</Text>
                    <TextInput
                      style={styles.input}
                      value={form.imagenUrl}
                      onChangeText={(value) => setForm((prev) => ({ ...prev, imagenUrl: value }))}
                    />
                  </>
                ) : null}

                <View style={styles.modalFooter}>
                  {isReadOnly ? (
                    <>
                      <TouchableOpacity
                        style={styles.secondaryBtn}
                        onPress={handleStartEdit}
                        disabled={isDetailLoading}
                      >
                        <PencilLine size={16} color="#101828" />
                        <Text style={styles.secondaryBtnText}>Editar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={() => setIsModalVisible(false)}
                      >
                        <Text style={styles.cancelBtnText}>Cerrar</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={() => {
                          if (isCreate) {
                            setIsModalVisible(false);
                          } else {
                            setModalMode('view');
                            if (selectedProduct) {
                              setForm(toFormFromUiProduct(selectedProduct));
                            }
                          }
                        }}
                        disabled={isSaving}
                      >
                        <Text style={styles.cancelBtnText}>{isCreate ? 'Cancelar' : 'Volver'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.saveBtn, isSaving ? styles.saveBtnDisabled : null]}
                        onPress={() => {
                          handleSave().catch(() => {
                            Alert.alert('Error', 'No se pudo guardar el producto.');
                          });
                        }}
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                          <Text style={styles.saveBtnText}>{isCreate ? 'Crear' : 'Guardar'}</Text>
                        )}
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', padding: 16 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1C273F', marginBottom: 20, marginTop: 40 },
  headerActions: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12 },
  searchInput: { flex: 1, height: 40, marginLeft: 8, fontSize: 14 },
  filterBtn: { padding: 10, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8 },
  addBtn: { backgroundColor: '#1C273F', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 12, borderRadius: 8, marginBottom: 16, gap: 8 },
  addBtnText: { color: '#FFF', fontWeight: '600' },
  errorCard: { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5', borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 16 },
  errorTitle: { color: '#991B1B', fontWeight: '700', marginBottom: 4 },
  errorDescription: { color: '#7F1D1D', marginBottom: 10, fontSize: 12 },
  retryBtn: { alignSelf: 'flex-start', backgroundColor: '#991B1B', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  retryBtnText: { color: '#FFF', fontWeight: '600', fontSize: 12 },
  tableCard: { backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', flex: 1, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#1C273F', padding: 12 },
  headerTextCol: { flex: 1, color: '#FFF', fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
  productRow: { flexDirection: 'row', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', alignItems: 'center' },
  skuCol: { flex: 1, alignItems: 'center' },
  nameCol: { flex: 2, paddingHorizontal: 4 },
  stockCol: { flex: 1, alignItems: 'center' },
  actionsCol: { flex: 1, alignItems: 'center' },
  cellText: { fontSize: 11, color: '#101828' },
  productNameText: { fontSize: 12, fontWeight: 'bold', color: '#101828' },
  categoryText: { fontSize: 10, color: '#6B7280' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 10, fontWeight: 'bold' },
  loaderBox: { minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loaderText: { color: '#4B5563', fontSize: 13 },
  emptyContainer: { flexGrow: 1, minHeight: 220, justifyContent: 'center' },
  emptyText: { textAlign: 'center', color: '#6B7280', fontSize: 14, paddingHorizontal: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#FFF', width: '92%', borderRadius: 16, padding: 20, maxHeight: '86%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#101828' },
  modalForm: { marginBottom: 10 },
  label: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  helperText: { fontSize: 11, color: '#6B7280', marginBottom: 10 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 6, padding: 10, fontSize: 14, marginBottom: 12, color: '#101828' },
  inputDisabled: { backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 6, padding: 10, fontSize: 14, marginBottom: 12, color: '#9CA3AF' },
  rowInputs: { flexDirection: 'row' },
  flexInputRight: { flex: 1, marginRight: 8 },
  flexInputLeft: { flex: 1 },
  modalFooter: { flexDirection: 'row', gap: 10, marginTop: 10 },
  secondaryBtn: { flex: 1, padding: 12, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  secondaryBtnText: { color: '#101828', fontWeight: '500' },
  cancelBtn: { flex: 1, padding: 12, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { color: '#101828', fontWeight: '500' },
  saveBtn: { flex: 1, padding: 12, backgroundColor: '#1C273F', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { color: '#FFF', fontWeight: '600' },
});

