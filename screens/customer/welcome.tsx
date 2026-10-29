import React, { useCallback, useEffect, useState } from 'react';
import {
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../navigator';
import { supabase } from '../../supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

type Category = {
  id: string;
  name: string;
  description?: string | null;
};

type Garment = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  available: boolean | null;
};

type Design = {
  id: string;
  name: string;
  description?: string | null;
  image_url: string | null;
  garment_part_id?: string | null;
};

/* ---------- Theme ---------- */
const COLORS = {
  rose: '#E8558A',
  roseDark: '#C93F73',
  blush: '#FFF1F6',
  blushDeep: '#FCE0EC',
  ink: '#2B1B24',
  muted: '#7C6B74',
  line: '#F1E3EA',
  bg: '#FFFAFC',
  white: '#FFFFFF',
};

const STEPS = [
  {
    title: 'Pick a garment',
    text: 'Browse categories and garments from our catalog.',
  },
  {
    title: 'Choose your design',
    text: 'Select designs, fabrics and options you like.',
  },
  {
    title: 'Add your measurements',
    text: 'Save them once and reuse them for every order.',
  },
  {
    title: 'Track your order',
    text: 'See its progress from production to delivery.',
  },
];

/* ---------- Small components ---------- */
function CatalogImage({
  imageUrl,
  label,
}: {
  imageUrl: string | null;
  label: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [imageUrl]);

  if (!imageUrl || imageFailed) {
    return (
      <View style={styles.imageFallback}>
        <Text style={styles.fallbackText}>{label}</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: imageUrl }}
      style={styles.productImage}
      resizeMode="cover"
      onError={() => setImageFailed(true)}
    />
  );
}

function SectionHeader({
  title,
  subtitle,
  onSeeAll,
}: {
  title: string;
  subtitle: string;
  onSeeAll?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderText}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      </View>
      {onSeeAll ? (
        <TouchableOpacity onPress={onSeeAll} hitSlop={10}>
          <Text style={styles.seeAll}>See all</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function ProductCard({
  name,
  description,
  imageUrl,
  fallbackLabel,
  onPress,
}: {
  name: string;
  description: string;
  imageUrl: string | null;
  fallbackLabel: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.productCard}
      activeOpacity={0.9}
      onPress={onPress}
    >
      <CatalogImage imageUrl={imageUrl} label={fallbackLabel} />
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.productDescription} numberOfLines={2}>
          {description}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function SkeletonRow() {
  return (
    <ScrollView
      horizontal
      scrollEnabled={false}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.horizontalList}
    >
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.skeletonCard}>
          <View style={styles.skeletonImage} />
          <View style={styles.skeletonLine} />
          <View style={[styles.skeletonLine, { width: '50%' }]} />
        </View>
      ))}
    </ScrollView>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

/* ---------- Screen ---------- */
export default function WelcomeScreen({ navigation }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [garments, setGarments] = useState<Garment[]>([]);
  const [designs, setDesigns] = useState<Design[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setLoadError('');

    try {
      const [categoryResult, garmentResult, designResult] =
        await Promise.all([
          supabase
            .from('garment_categories')
            .select('id, name, description, is_available')
            .eq('is_available', true)
            .order('created_at', { ascending: false }),

          supabase
            .from('garments')
            .select('id, name, description, image_url, available')
            .eq('available', true)
            .order('created_at', { ascending: false })
            .limit(6),

          supabase
            .from('designs')
            .select('id, name, description, image_url, garment_part_id')
            .order('created_at', { ascending: false })
            .limit(6),
        ]);

      if (
        categoryResult.error ||
        garmentResult.error ||
        designResult.error
      ) {
        console.error('Category error:', categoryResult.error?.message);
        console.error('Garment error:', garmentResult.error?.message);
        console.error('Design error:', designResult.error?.message);

        setCategories(categoryResult.data ?? []);
        setGarments(garmentResult.data ?? []);
        setDesigns(designResult.data ?? []);

        setLoadError(
          'Some items could not be loaded. Check your connection and try again.'
        );
        return;
      }

      setCategories(categoryResult.data ?? []);
      setGarments(garmentResult.data ?? []);
      setDesigns(designResult.data ?? []);
    } catch (error) {
      console.error('Catalog loading error:', error);
      setLoadError(
        'The catalog could not be loaded. Check your connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const goToRegister = () => navigation.navigate('Register');
  const goToLogin = () => navigation.navigate('Login');

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {/* HEADER (stays visible while scrolling) */}
      <View style={styles.header}>
        <Image
          source={require('../../assets/Pink Blush Fashion Logo.png')}
          style={styles.headerLogo}
          resizeMode="contain"
        />
        <TouchableOpacity
          style={styles.headerLogin}
          onPress={goToLogin}
          activeOpacity={0.8}
        >
          <Text style={styles.headerLoginText}>Log in</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO */}
        <View style={styles.hero}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>Made-to-order fashion</Text>
          </View>

          <Text style={styles.heroTitle}>
            Custom garments, made for you.
          </Text>

          <Text style={styles.heroDescription}>
            Choose a style, pick your design and place your order in a few
            taps.
          </Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={goToRegister}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>Get started</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={goToLogin} hitSlop={10}>
            <Text style={styles.loginPrompt}>
              Already have an account?{' '}
              <Text style={styles.pinkText}>Log in</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* ERROR BANNER */}
        {loadError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{loadError}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={loadCatalog}
              activeOpacity={0.85}
            >
              <Text style={styles.retryButtonText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* CATEGORIES */}
        <View style={styles.section}>
          <SectionHeader
            title="Shop by category"
            subtitle="Find the style you need"
          />

          {loading ? (
            <View style={styles.pillRow}>
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={styles.skeletonPill} />
              ))}
            </View>
          ) : categories.length === 0 ? (
            <EmptyState message="No categories yet. Check back soon." />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            >
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={styles.categoryPill}
                  activeOpacity={0.85}
                  onPress={goToLogin}
                >
                  <Text style={styles.categoryName} numberOfLines={1}>
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* GARMENTS */}
        <View style={styles.section}>
          <SectionHeader
            title="Available garments"
            subtitle="Ready to order"
            onSeeAll={garments.length > 0 ? goToLogin : undefined}
          />

          {loading ? (
            <SkeletonRow />
          ) : garments.length === 0 ? (
            <EmptyState message="New garments are coming soon." />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
              decelerationRate="fast"
              snapToInterval={CARD_WIDTH + 14}
            >
              {garments.map((garment) => (
                <ProductCard
                  key={garment.id}
                  name={garment.name}
                  description={
                    garment.description?.trim() ||
                    'A garment made to fit your style.'
                  }
                  imageUrl={garment.image_url}
                  fallbackLabel="Garment"
                  onPress={goToLogin}
                />
              ))}
            </ScrollView>
          )}
        </View>

        {/* DESIGNS */}
        <View style={styles.section}>
          <SectionHeader
            title="Featured designs"
            subtitle="Make your garment one of a kind"
            onSeeAll={designs.length > 0 ? goToLogin : undefined}
          />

          {loading ? (
            <SkeletonRow />
          ) : designs.length === 0 ? (
            <EmptyState message="New designs are coming soon." />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
              decelerationRate="fast"
              snapToInterval={CARD_WIDTH + 14}
            >
              {designs.map((design) => (
                <ProductCard
                  key={design.id}
                  name={design.name}
                  description={
                    design.description?.trim() ||
                    'Add this design to your custom garment.'
                  }
                  imageUrl={design.image_url}
                  fallbackLabel="Design"
                  onPress={goToLogin}
                />
              ))}
            </ScrollView>
          )}
        </View>

        {/* HOW IT WORKS */}
        <View style={styles.howSection}>
          <Text style={styles.sectionTitle}>How it works</Text>
          <Text style={[styles.sectionSubtitle, { marginBottom: 18 }]}>
            Four simple steps from idea to delivery
          </Text>

          {STEPS.map((step, index) => (
            <View key={step.title} style={styles.stepRow}>
              <Text style={styles.stepNumber}>{index + 1}</Text>

              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepText}>{step.text}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* FINAL CTA */}
        <View style={styles.ctaSection}>
          <Text style={styles.ctaTitle}>Ready to place your order?</Text>
          <Text style={styles.ctaDescription}>
            Create a free account to browse the full catalog and start
            customizing.
          </Text>

          <TouchableOpacity
            style={styles.ctaButton}
            onPress={goToRegister}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaButtonText}>Create an account</Text>
          </TouchableOpacity>
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <Image
            source={require('../../assets/Pink Blush Fashion Logo.png')}
            style={styles.footerLogo}
            resizeMode="contain"
          />
          <Text style={styles.footerText}>
            Garment Order and Production Management System
          </Text>
          <Text style={styles.footerCopyright}>
            © 2026 Pink Blush Fashion
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

/* ---------- Styles ---------- */
const CARD_WIDTH = 190;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  container: {
    flex: 1,
  },

  contentContainer: {
    paddingBottom: 24,
  },

  /* Header */
  header: {
    minHeight: 64,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },

  headerLogo: {
    width: 130,
    height: 46,
  },

  headerLogin: {
    backgroundColor: COLORS.blush,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 9,
  },

  headerLoginText: {
    color: COLORS.rose,
    fontWeight: '700',
    fontSize: 14,
  },

  /* Hero */
  hero: {
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 22,
    paddingTop: 34,
    paddingBottom: 28,
    borderRadius: 24,
    backgroundColor: COLORS.blush,
    alignItems: 'center',
  },

  heroBadge: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 6,
    marginBottom: 18,
  },

  heroBadgeText: {
    color: COLORS.rose,
    fontSize: 12,
    fontWeight: '700',
  },

  heroTitle: {
    color: COLORS.ink,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
  },

  heroDescription: {
    color: COLORS.muted,
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 24,
    maxWidth: 320,
  },

  primaryButton: {
    backgroundColor: COLORS.rose,
    borderRadius: 14,
    width: '100%',
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: COLORS.rose,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },

  primaryButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },

  loginPrompt: {
    marginTop: 16,
    color: COLORS.muted,
    fontSize: 14,
  },

  pinkText: {
    color: COLORS.rose,
    fontWeight: '700',
  },

  /* Sections */
  section: {
    paddingTop: 32,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 14,
  },

  sectionHeaderText: {
    flex: 1,
    paddingRight: 12,
  },

  sectionTitle: {
    color: COLORS.ink,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },

  sectionSubtitle: {
    color: COLORS.muted,
    fontSize: 14,
    marginTop: 3,
  },

  seeAll: {
    color: COLORS.rose,
    fontSize: 14,
    fontWeight: '700',
  },

  horizontalList: {
    paddingHorizontal: 20,
    paddingBottom: 6,
    gap: 14,
  },

  /* Categories */
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 30,
    paddingVertical: 12,
    paddingHorizontal: 20,
    maxWidth: 220,
  },



  categoryName: {
    color: COLORS.ink,
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 1,
  },

  /* Product cards */
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: COLORS.white,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.line,
  },

  productImage: {
    width: '100%',
    height: 210,
    backgroundColor: COLORS.blush,
  },

  imageFallback: {
    width: '100%',
    height: 210,
    backgroundColor: COLORS.blush,
    alignItems: 'center',
    justifyContent: 'center',
  },



  fallbackText: {
    color: COLORS.rose,
    fontSize: 14,
    fontWeight: '700',
  },

  productInfo: {
    padding: 14,
  },

  productName: {
    color: COLORS.ink,
    fontSize: 16,
    fontWeight: '700',
  },

  productDescription: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    minHeight: 36,
  },


  /* Loading + empty + error */
  skeletonCard: {
    width: CARD_WIDTH,
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.line,
  },

  skeletonImage: {
    height: 170,
    borderRadius: 12,
    backgroundColor: COLORS.blush,
    marginBottom: 12,
  },

  skeletonLine: {
    height: 10,
    width: '80%',
    borderRadius: 5,
    backgroundColor: COLORS.blushDeep,
    marginBottom: 8,
  },

  pillRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
  },

  skeletonPill: {
    width: 100,
    height: 46,
    borderRadius: 25,
    backgroundColor: COLORS.blush,
  },

  emptyState: {
    marginHorizontal: 20,
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.blushDeep,
    alignItems: 'center',
  },

  emptyText: {
    color: COLORS.muted,
    fontSize: 14,
    textAlign: 'center',
  },

  errorBanner: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#FFF4E5',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  errorText: {
    flex: 1,
    color: '#7A4B00',
    fontSize: 13,
    lineHeight: 18,
  },

  retryButton: {
    backgroundColor: COLORS.rose,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },

  retryButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },

  /* How it works */
  howSection: {
    marginTop: 36,
    marginHorizontal: 16,
    padding: 22,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.line,
  },

  stepRow: {
    flexDirection: 'row',
  },



  stepNumber: {
    color: COLORS.rose,
    fontSize: 18,
    fontWeight: '800',
    width: 30,
    marginTop: 1,
  },


  stepContent: {
    flex: 1,
    paddingBottom: 20,
  },

  stepTitle: {
    color: COLORS.ink,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 0,
  },

  stepText: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 3,
  },

  /* CTA */
  ctaSection: {
    marginHorizontal: 16,
    marginTop: 24,
    paddingHorizontal: 22,
    paddingVertical: 32,
    borderRadius: 24,
    backgroundColor: COLORS.rose,
    alignItems: 'center',
  },

  ctaTitle: {
    color: COLORS.white,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    textAlign: 'center',
  },

  ctaDescription: {
    color: '#FFE3EE',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 22,
  },

  ctaButton: {
    width: '100%',
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    alignItems: 'center',
  },

  ctaButtonText: {
    color: COLORS.roseDark,
    fontSize: 16,
    fontWeight: '800',
  },

  /* Footer */
  footer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 10,
  },

  footerLogo: {
    width: 130,
    height: 46,
  },

  footerText: {
    color: COLORS.muted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },

  footerCopyright: {
    color: '#B3A5AC',
    fontSize: 12,
    marginTop: 8,
  },
});